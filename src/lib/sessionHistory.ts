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
  const shopId = await getShopId();
  if (!shopId) return [];
  const limit = opts.limit ?? 20;
  const params = new URLSearchParams();
  params.set('shop_id', `eq.${shopId}`);
  params.set('select', 'session_id,title,dtc_codes,created_at,last_step,user_email');
  params.set('order', 'created_at.desc');
  params.set('limit', String(limit));
  if (opts.before) params.append('created_at', `lt.${opts.before}`);
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
