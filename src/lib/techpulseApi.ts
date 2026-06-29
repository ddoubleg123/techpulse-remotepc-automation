/**
 * TechPulse case confirm / save wrappers.
 *
 * These now hit the web app's OWN same-origin API routes (/api/confirm-case,
 * /api/save-case), which generate the embedding (OpenAI text-embedding-3-small)
 * and write to diagnostic_case_studies. The old app.atrguide.com base is dead
 * (503 since June 19) and has been removed. Repoint confirmed by Mike, June 24.
 */

const SYNTH_API_BASE = '/api';

// ---------- Payload types ----------

export interface ConfirmCasePayload {
  unid: string;
  year: number;
  make: string;
  model: string;
  dtc_codes: string[];
  complaint: string;
  what_fixed_it: string;
  lesson_learned: string;
  transcript_html: string;
}

export interface SaveNotHelpfulPayload {
  unid: string;
  vehicle: string;            // e.g. "2018 Hyundai Tucson"
  year: number;
  make: string;
  model: string;
  complaint: string;
  dtc_codes: string[];
  what_synth_said: string;
  what_fixed_it: string;
  tech_notes?: string;
  transcript_html: string;
  attachments?: Array<{ name: string; mime: string; data_base64: string }>;
}

export interface SaveCasePayload {
  unid: string;
  conversation_text: string;
  year: number;
  make: string;
  model: string;
  dtc_codes: string[];
  complaint: string;
  diagnosis: string;
  fix: string;
  conclusion: string;
  cheat_sheet_title: string;
  cheat_sheet_content: string;
  // Attribution + structured chat (optional; older callers omit them).
  shop_id?: string | null;
  created_by?: string | null;
  messages?: Array<{ role: string; content: string; ts?: number }>;
}

// ---------- Internal POST helper ----------

async function postJSON<T = unknown>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${SYNTH_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`${path} failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  // Endpoints may return empty bodies on success; be tolerant.
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// ---------- Public API ----------

export function postConfirmCase(payload: ConfirmCasePayload, token?: string) {
  return postJSON('/confirm-case', payload, token);
}

export function postSaveNotHelpful(payload: SaveNotHelpfulPayload, token?: string) {
  return postJSON('/save-not-helpful', payload, token);
}

export function postSaveCase(payload: SaveCasePayload, token?: string) {
  return postJSON('/save-case', payload, token);
}

// ---------- Stub builder for save-case cheat sheet (Option B per Mike) ----------
//
// The web app sends a *stub* title and content; /api/save-case has the
// Anthropic key server-side and runs Haiku synthesis itself.

export function buildCheatSheetStub(args: {
  year: number;
  make: string;
  model: string;
  dtc_codes: string[];
  complaint: string;
  fix: string;
}): { cheat_sheet_title: string; cheat_sheet_content: string } {
  const codes = (args.dtc_codes ?? []).filter(Boolean).join('/');
  const title = `${args.year} ${args.make} ${args.model}${codes ? ' — ' + codes : ''}`;
  const content = `Fix: ${args.fix}. Complaint: ${args.complaint}.`;
  return { cheat_sheet_title: title, cheat_sheet_content: content };
}
