// sessionHistory.ts — shop-wide diagnostic history (read side).
// Reads chat_sessions for the current user's shop, newest-first, keyset-paginated.
// Mirrors the auth pattern used by the diagnostic persist writes:
//   Authorization: Bearer <user token>, apikey: <publishable/anon key>.
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface SessionSummary {
  session_id: string;
  title: string | null;
  dtc_codes: string[] | null;
  created_at: string;
  last_step: string | null;
  user_email: string | null;
}

export interface SessionDetail extends SessionSummary {
  vehicle_context: Record<string, unknown> | null;
  messages: unknown[] | null;
  shop_id: string | null;
  user_id: string | null;
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token || SUPABASE_ANON_KEY;
  return { Authorization: 'Bearer ' + token, apikey: SUPABASE_ANON_KEY };
}

function subFromToken(): string {
  try {
    const t = useAuthStore.getState().token || '';
    return JSON.parse(atob(t.split('.')[1] || '')).sub || '';
  } catch {
    return '';
  }
}

/** Resolve the current user's shop_id (uuid) from their profile. Cached per session. */
let _cachedShopId: string | null | undefined;
export async function getShopId(): Promise<string | null> {
  if (_cachedShopId !== undefined) return _cachedShopId ?? null;
  const sub = subFromToken();
  if (!sub) { _cachedShopId = null; return null; }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${encodeURIComponent(sub)}&select=shop_id`,
      { headers: authHeaders() }
    );
    if (!res.ok) { _cachedShopId = null; return null; }
    const rows = await res.json();
    _cachedShopId = (rows && rows[0] && rows[0].shop_id) || null;
    return _cachedShopId ?? null;
  } catch {
    _cachedShopId = null;
    return null;
  }
}

/** Clear the cached shop id (e.g. on sign-out / shop switch). */
export function resetShopCache(): void { _cachedShopId = undefined; }

/**
 * List sessions for the user's shop, newest first.
 * Keyset pagination: pass `before` = the created_at of the last row you saw.
 */
export async function listSessions(
  opts: { limit?: number; before?: string } = {}
): Promise<SessionSummary[]> {
  // Use the email-keyed RPC: it resolves the caller's shop from the verified JWT
  // (email claim) so it works for OTP/OAuth users whose token has no auth.uid().
  // The old direct chat_sessions query depended on a Supabase sub and returned
  // nothing for those users — the cause of empty Auto History.
  const limit = opts.limit ?? 20;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_chat_sessions`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_limit: limit, p_before: opts.before ?? null }),
    });
    if (!res.ok) return [];
    return (await res.json()) as SessionSummary[];
  } catch {
    return [];
  }
}

/**
 * Search the shop's sessions by vehicle (title), DTC code, or date text.
 * Server-side (covers ALL the shop's sessions, not just the loaded page).
 * Matches the title (year/make/model live there) and the dtc_codes array.
 */
export async function searchSessions(
  q: string,
  opts: { limit?: number } = {}
): Promise<SessionSummary[]> {
  const shopId = await getShopId();
  if (!shopId) return [];
  const term = q.trim();
  if (!term) return [];
  const limit = opts.limit ?? 50;
  // ilike on title OR a containment match on the dtc_codes text[] array.
  // PostgREST: cs(title.ilike.*term*,dtc_codes.cs.{TERM}) — but array contains
  // needs an exact element, so we OR title ilike with a cast-to-text ilike on
  // the array via a computed filter. Simpler + robust: match title OR user_email,
  // and also try the DTC as an array element when it looks like a code.
  const esc = term.replace(/([%,()])/g, '\\$1');
  const ors = [`title.ilike.*${esc}*`, `user_email.ilike.*${esc}*`];
  // If it looks like a DTC code, also match the array element exactly.
  if (/^[PBCU][0-9A-Za-z-]{2,}$/i.test(term)) {
    ors.push(`dtc_codes.cs.{${term.toUpperCase()}}`);
  }
  const params = new URLSearchParams();
  params.set('shop_id', `eq.${shopId}`);
  params.set('select', 'session_id,title,dtc_codes,created_at,last_step,user_email');
  params.set('or', `(${ors.join(',')})`);
  params.set('order', 'created_at.desc');
  params.set('limit', String(limit));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return (await res.json()) as SessionSummary[];
  } catch {
    return [];
  }
}

/**
 * Look up the generated report for a session, if any. Reports live on
 * diagnostic_case_studies (linked by unid = session_id) where the PDF urls are.
 * Returns the best available PDF url + outcome, or null if no report exists.
 */
export interface SessionReport {
  diagnosis_pdf_url: string | null;
  before_after_pdf_url: string | null;
  estimate_pdf_url: string | null;
  diagnosis_outcome: string | null;
}
export async function getSessionReport(sessionId: string): Promise<SessionReport | null> {
  if (!sessionId) return null;
  const params = new URLSearchParams();
  params.set('unid', `eq.${sessionId}`);
  params.set('select', 'diagnosis_pdf_url,before_after_pdf_url,estimate_pdf_url,diagnosis_outcome');
  params.set('limit', '1');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/diagnostic_case_studies?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const r = rows && rows[0];
    if (!r) return null;
    // Only return if there's actually a report artifact.
    if (!r.diagnosis_pdf_url && !r.before_after_pdf_url && !r.estimate_pdf_url) return null;
    return r as SessionReport;
  } catch {
    return null;
  }
}

/**
 * Persist an updated messages array back to a session so follow-up chat in the
 * History view is saved (each chat stays "live" across navigations/refreshes).
 * Upserts on session_id; owner/shop RLS allows the writer to update their row.
 */
export async function saveSessionMessages(
  sessionId: string,
  messages: unknown[]
): Promise<boolean> {
  if (!sessionId) return false;
  // Use the email-keyed RPC so the write succeeds for OTP/OAuth users whose
  // token has no auth.uid() (the old `if (!sub) return` guard plus the
  // auth.uid()-based RLS made the write silently no-op for them). The RPC
  // attributes the row to the caller's own email + shop, derived server-side.
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_chat_session`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_session_id: sessionId,
        p_messages: messages ?? [],
        p_last_step: 'report',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Load one full session (vehicle_context + messages) for rehydration. */
export async function loadSession(sessionId: string): Promise<SessionDetail | null> {
  const shopId = await getShopId();
  if (!shopId) return null;
  const params = new URLSearchParams();
  params.set('session_id', `eq.${sessionId}`);
  params.set('select', '*');
  params.set('limit', '1');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return (rows && rows[0]) || null;
  } catch {
    return null;
  }
}
