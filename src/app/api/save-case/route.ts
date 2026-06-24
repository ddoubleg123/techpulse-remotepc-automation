// POST /api/save-case
// Persists a confirmed web case into diagnostic_case_studies.
//
// Contract (per Mike, June 24 2026): NO server-side AI. The modal assembles
// diagnosis / fix / conclusion / cheat sheet client-side. This endpoint does
// exactly two things:
//   1. Generate the embedding (OpenAI text-embedding-3-small, 1536) from
//      complaint + diagnosis + fix + conclusion.
//   2. UPSERT the row into diagnostic_case_studies (keyed on unid) with the
//      payload fields + embedding.
// Mike's pipeline (CONFIRM CORRECT / kb_gate) handles synthesis afterward.
// synth_guided is NEVER set here.
//
// Payload (SaveCasePayload):
//   { unid, conversation_text, year, make, model, dtc_codes, complaint,
//     diagnosis, fix, conclusion, cheat_sheet_title, cheat_sheet_content }
//
// Env: CONFIRM_TOKEN, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { NextRequest, NextResponse } from 'next/server';
import { buildEmbeddingText, generateEmbedding } from '@/lib/embedding';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';

interface SaveCaseBody {
  unid?: string;
  conversation_text?: string;
  year?: number;
  make?: string;
  model?: string;
  dtc_codes?: string[];
  complaint?: string;
  diagnosis?: string;
  fix?: string;
  conclusion?: string;
  cheat_sheet_title?: string;
  cheat_sheet_content?: string;
}

export async function POST(req: NextRequest) {
  const CONFIRM_TOKEN = process.env.CONFIRM_TOKEN || '';
  const SYNTH_T1 = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Auth — accept the T1 Synth token the modal sends, or CONFIRM_TOKEN.
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const accepted = [CONFIRM_TOKEN, SYNTH_T1].filter(Boolean);
  if (accepted.length === 0 || !token || !accepted.includes(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 });
  }

  // 2. Body
  let body: SaveCaseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const {
    unid, conversation_text, year, make, model, dtc_codes,
    complaint, diagnosis, fix, conclusion,
    cheat_sheet_title, cheat_sheet_content,
  } = body;
  if (!unid || typeof unid !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid unid' }, { status: 400 });
  }

  // 3. Embedding — Mike's formula: complaint + diagnosis + fix + conclusion.
  const embedText = buildEmbeddingText({ complaint, diagnosis, fix, conclusion });
  const emb = await generateEmbedding(embedText);
  if (!emb.ok) {
    return NextResponse.json({ error: emb.error }, { status: emb.status });
  }

  // 4. Assemble the row. Only payload-provided fields + embedding; no synthesis.
  //    title prefers the cheat sheet title; falls back to vehicle + codes.
  const codes = (dtc_codes || []).filter(Boolean);
  const vehicleTitle = [year, make, model].filter(Boolean).join(' ');
  const title = cheat_sheet_title
    || `${vehicleTitle}${codes.length ? ' — ' + codes.join('/') : ''}`
    || 'Web case';

  const row: Record<string, unknown> = {
    unid,
    source: 'web',
    title,
    year: year ?? null,
    make: make ?? null,
    model: model ?? null,
    dtc_codes: codes.length ? codes : null,
    complaint: complaint ?? null,
    diagnosis: diagnosis ?? null,
    fix: fix ?? null,
    conclusion: conclusion ?? null,
    full_content: conversation_text ?? null,
    embedding: emb.embedding,
    category: 'case_study',
    diagnosis_outcome: 'confirmed_correct',
    confirmed_date: new Date().toISOString().slice(0, 10),
    // cheat sheet content stored in technical_notes so it isn't lost; Mike's
    // pipeline can relocate it if it has a dedicated home.
    technical_notes: cheat_sheet_content ?? null,
    // synth_guided intentionally omitted — Mike's gate.
  };

  // 5. Manual upsert keyed on unid. The table has no unique constraint on
  //    unid (only PK on id), so we can't use on_conflict — check first, then
  //    PATCH the existing row or INSERT a new one. Avoids altering Mike's schema.
  try {
    const lookupUrl = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?unid=eq.${encodeURIComponent(unid)}&select=id`;
    const lookup = await fetch(lookupUrl, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    const existing: Array<{ id: string }> = lookup.ok ? await lookup.json() : [];

    let res: Response;
    if (Array.isArray(existing) && existing.length > 0) {
      // Update the existing row (don't overwrite unid/source/created_at).
      const { ...patchRow } = row;
      delete (patchRow as Record<string, unknown>).source;
      res = await fetch(
        `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?unid=eq.${encodeURIComponent(unid)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(patchRow),
        }
      );
    } else {
      res = await fetch(`${SUPABASE_URL}/rest/v1/diagnostic_case_studies`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
    }
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Write failed (HTTP ${res.status}): ${errText.slice(0, 250)}` },
        { status: 500 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase write failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    unid,
    embeddingDims: emb.embedding.length,
    note: 'Case persisted. No server-side synthesis (Mike\'s pipeline handles the rest).',
  });
}
