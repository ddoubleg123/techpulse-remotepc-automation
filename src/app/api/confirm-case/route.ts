// POST /api/confirm-case
// Promotes a web diagnostic session toward Synth's training corpus.
//
// What this does (per Mike's gate design):
//   - Marks the case diagnosis_outcome='confirmed_correct'
//   - Builds full_content from vehicle/complaint/messages/diagnosis/fix
//   - Generates a 1536-dim embedding via OpenAI text-embedding-3-small
//   - Stamps confirmed_date
//
// What this DOES NOT do:
//   - Set synth_guided=true. That's reserved for Mike's CONFIRM CORRECT
//     command, which lets cases through the kb_gate.py q_cases filter.
//
// Required env vars:
//   CONFIRM_TOKEN              shared secret for Bearer auth
//   OPENAI_API_KEY             for embedding generation
//   SUPABASE_SERVICE_ROLE_KEY  for PATCH bypassing RLS

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';

type CaseRow = {
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
  fix: string | null;
  messages: Array<{ role: string; content: string }> | null;
};

export async function POST(req: NextRequest) {
  const CONFIRM_TOKEN = process.env.CONFIRM_TOKEN || '';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Auth
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!CONFIRM_TOKEN || !token || token !== CONFIRM_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Env checks
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 });
  }

  // 3. Body
  let body: { unid?: string; technicianNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { unid, technicianNotes } = body;
  if (!unid || typeof unid !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid unid' }, { status: 400 });
  }

  // 4. Fetch the case
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

  // 5. Build full_content
  const fullContent = buildFullContent(caseRow, technicianNotes);
  if (!fullContent || fullContent.length < 20) {
    return NextResponse.json(
      { error: 'Case has insufficient content to confirm (need vehicle + complaint + diagnosis)' },
      { status: 400 }
    );
  }

  // 6. Generate embedding
  let embedding: number[];
  try {
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: fullContent.slice(0, 8000), // text-embedding-3-small handles 8191 tokens; ~8k chars is safe
      }),
    });
    if (!embedRes.ok) {
      const errText = await embedRes.text();
      return NextResponse.json(
        { error: `OpenAI embedding failed: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const data = await embedRes.json();
    embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json({ error: 'OpenAI returned no embedding' }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: `OpenAI call failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 502 }
    );
  }

  // 7. PATCH the case. Note: synth_guided is NOT set here; only Mike's
  // CONFIRM CORRECT command on his side flips that gate.
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
        full_content: fullContent,
        embedding,
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
    embeddingDims: embedding.length,
    note: 'Shop confirmed. Awaiting Mike\'s CONFIRM CORRECT to set synth_guided=true.',
  });
}

function buildFullContent(c: CaseRow, technicianNotes?: string): string {
  const parts: string[] = [];
  const vehicle = [c.year, c.make, c.model, c.engine].filter(Boolean).join(' ');
  if (vehicle) parts.push(`Vehicle: ${vehicle}`);
  if (c.vin) parts.push(`VIN: ${c.vin}`);
  if (c.dtc_codes && c.dtc_codes.length > 0) parts.push(`DTCs: ${c.dtc_codes.join(', ')}`);
  if (c.complaint) parts.push(`Complaint: ${c.complaint}`);
  if (c.symptoms) parts.push(`Symptoms: ${c.symptoms}`);
  if (Array.isArray(c.messages) && c.messages.length > 0) {
    const transcript = c.messages
      .map(m => `${m.role === 'user' ? 'Tech' : 'Synth'}: ${m.content}`)
      .join('\n\n');
    if (transcript) parts.push(`Transcript:\n${transcript}`);
  }
  if (c.diagnosis) parts.push(`Diagnosis: ${c.diagnosis}`);
  if (c.fix) parts.push(`Fix: ${c.fix}`);
  if (technicianNotes) parts.push(`Technician notes: ${technicianNotes}`);
  return parts.join('\n\n');
}
