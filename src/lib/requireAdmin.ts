import { cookies } from 'next/headers';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Authoritative admin check, server-side only.
 *  1. Reads the access token from the tp_at cookie.
 *  2. Validates it against Supabase /auth/v1/user (verifies signature + expiry
 *     server-side — we never trust the token's claims unverified).
 *  3. Looks up the user's role in public.users via the service-role key
 *     (bypasses RLS) and requires role = 'admin'.
 * Returns the admin user, or null if anything fails (fail closed).
 */
export async function requireAdmin(): Promise<AdminUser | null> {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!SERVICE_KEY || !ANON_KEY) return null; // not configured -> deny

  const cookieStore = await cookies();
  const token = cookieStore.get('tp_at')?.value || '';
  if (!token) return null;

  // 1) Validate the token (Supabase verifies the ES256 signature + expiry).
  let sub = '';
  let email = '';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = await res.json();
    sub = u?.id || '';
    email = u?.email || '';
    if (!sub) return null;
  } catch {
    return null;
  }

  // 2) Authoritative role lookup via service role.
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=id,email,role`,
      {
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || row.role !== 'admin') return null;
    return { id: row.id, email: row.email || email, role: row.role };
  } catch {
    return null;
  }
}
