import { cookies } from 'next/headers';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Authoritative admin check, server-side only. Uses the user's own token +
 * the publishable/anon key — no service key required.
 *  1. Reads the access token from the tp_at cookie.
 *  2. Validates it via Supabase /auth/v1/user (verifies ES256 signature +
 *     expiry server-side).
 *  3. Reads the caller's own users row with their token (RLS lets a user read
 *     their own row) and requires role = 'admin'.
 * Returns the admin user, or null on any failure (fail closed).
 */
export async function requireAdmin(): Promise<AdminUser | null> {
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!ANON_KEY) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get('tp_at')?.value || '';
  if (!token) return null;

  // 1) Validate the token.
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

  // 2) Read the caller's own row with their token (RLS: auth.uid() = id).
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=id,email,role`,
      {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
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
