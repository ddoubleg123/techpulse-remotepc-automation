// POST /api/confirm-case
// Promotes a web diagnostic session to confirmed_correct in the training corpus.
//
// Contract (per Mike, June 24 2026): RICH payload from the modal —
//   { unid, year, make, model, dtc_codes, complaint,
//     what_fixed_it, lesson_learned, transcript_html }
// Field mapping: what_fixed_it -> fix, lesson_learned -> technical_notes.
//
// What it does:
//   1. Auth via CONFIRM_TOKEN bearer
//   2. Locate the case by unid (must be source='web')
//   3. PATCH: diagnosis_outcome='confirmed_correct', fix, technical_notes,
//      full_content, embedding (OpenAI 1536), confirmed_date
//   NEVER sets synth_guided — that is Mike's gate (CONFIRM CORRECT / kb_gate).
//
// Embedding input = complaint + diagnosis + fix + conclusion (Mike's spec),
// generated via src/lib/embedding.ts (OpenAI text-embedding-3-small).
//
// Env: CONFIRM_TOKEN, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { NextRequest, NextResponse } from 'next/server';
import { buildEmbeddingText, generateEmbedding } from '@/lib/embedding';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';

type CaseRow = {
  id?: string;
  unid: string;
  source: string | null;
  year: number | string | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  vin: string | null;
  dtc_codes: string[] | null;
  complaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  conclusion: string | null;
  fix: string | null;
  messages: Array<{ role: string; content: string }> | null;
};

interface ConfirmBody {
  unid?: string;
  year?: number;
  make?: string;
  model?: string;
  dtc_codes?: string[];
  complaint?: string;
  what_fixed_it?: string;
  lesson_learned?: string;
  transcript_html?: string;
}

export async function POST(req: NextRequest) {
  const CONFIRM_TOKEN = process.env.CONFIRM_TOKEN || '';
  const SYNTH_T1 = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Auth — the modal sends the T1 Synth token (NEXT_PUBLIC_SYNTH_API_TOKEN).
  //    Accept that, or a dedicated CONFIRM_TOKEN if configured. At least one
  //    must be set and match.
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
  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { unid, what_fixed_it, lesson_learned } = body;
  if (!unid || typeof unid !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid unid' }, { status: 400 });
  }

  // 3. Fetch the existing case (need diagnosis + conclusion for the embedding,
  //    and to confirm it is a web session).
  const fetchUrl = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?unid=eq.${encodeURIComponent(unid)}&select=*`;
  let caseRow: CaseRow;
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch case (HTTP ${res.status})` }, { status: 500 });
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    caseRow = rows[0] as CaseRow;
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase fetch failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    );
  }

  if (caseRow.source !== 'web') {
    return NextResponse.json(
      { error: `Cannot confirm a case with source='${caseRow.source}'. Only web sessions are confirmable.` },
      { status: 400 }
    );
  }

  // 4. Apply the field mapping from the rich payload.
  const fix = (what_fixed_it || caseRow.fix || '').trim();
  const technicalNotes = (lesson_learned || '').trim();

  // 5. Build full_content (human-readable case record for retrieval display).
  const fullContent = buildFullContent(caseRow, fix, technicalNotes);
  if (!fullContent || fullContent.length < 20) {
    return NextResponse.json(
      { error: 'Case has insufficient content to confirm (need vehicle + complaint + diagnosis)' },
      { status: 400 }
    );
  }

  // 6. Embedding — Mike's formula: complaint + diagnosis + fix + conclusion.
  const embedText = buildEmbeddingText({
    complaint: caseRow.complaint,
    diagnosis: caseRow.diagnosis,
    fix,
    conclusion: caseRow.conclusion,
  });
  const emb = await generateEmbedding(embedText);
  if (!emb.ok) {
    return NextResponse.json({ error: emb.error }, { status: emb.status });
  }

  // 7. PATCH the case. synth_guided is intentionally NOT included.
  const patchUrl = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?unid=eq.${encodeURIComponent(unid)}`;
  try {
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        diagnosis_outcome: 'confirmed_correct',
        fix,
        technical_notes: technicalNotes || null,
        full_content: fullContent,
        embedding: emb.embedding,
        confirmed_date: new Date().toISOString().slice(0, 10),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Update failed (HTTP ${res.status}): ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase update failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    unid,
    fullContentLength: fullContent.length,
    embeddingDims: emb.embedding.length,
    note: "Confirmed correct. synth_guided left untouched (Mike's gate).",
  });
}

function buildFullContent(c: CaseRow, fix: string, technicianNotes?: string): string {
  const parts: string[] = [];
  const vehicle = [c.year, c.make, c.model, c.engine].filter(Boolean).join(' ');
  if (vehicle) parts.push(`Vehicle: ${vehicle}`);
  if (c.vin) parts.push(`VIN: ${c.vin}`);
  if (c.dtc_codes && c.dtc_codes.length > 0) parts.push(`DTCs: ${c.dtc_codes.join(', ')}`);
  if (c.complaint) parts.push(`Complaint: ${c.complaint}`);
  if (c.symptoms) parts.push(`Symptoms: ${c.symptoms}`);
  if (Array.isArray(c.messages) && c.messages.length > 0) {
    const transcript = c.messages
      .map((m) => `${m.role === 'user' ? 'Tech' : 'Synth'}: ${m.content}`)
      .join('\n\n');
    if (transcript) parts.push(`Transcript:\n${transcript}`);
  }
  if (c.diagnosis) parts.push(`Diagnosis: ${c.diagnosis}`);
  if (fix) parts.push(`Fix: ${fix}`);
  if (c.conclusion) parts.push(`Conclusion: ${c.conclusion}`);
  if (technicianNotes) parts.push(`Technician notes: ${technicianNotes}`);
  return parts.join('\n\n');
}
