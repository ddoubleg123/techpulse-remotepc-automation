import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic. Returns ONLY booleans/status codes — never any key or
// token value. Used to pinpoint why the admin gate denies. Remove after use.
export async function GET() {
  const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const out: Record<string, unknown> = {
    service_key_present: !!SERVICE_KEY,
    service_key_len: SERVICE_KEY.length,
    anon_key_present: !!ANON_KEY,
  };

  const cookieStore = await cookies();
  const token = cookieStore.get('tp_at')?.value || '';
  out.tp_at_cookie_present = !!token;

  if (token && ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY }, cache: 'no-store',
      });
      out.auth_user_status = r.status;
      if (r.ok) { const u = await r.json(); out.auth_sub_present = !!u?.id; out.auth_sub = u?.id || null; }
    } catch (e) { out.auth_user_error = String(e); }
  }

  if (token && SERVICE_KEY && out.auth_sub) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(String(out.auth_sub))}&select=role`, {
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY }, cache: 'no-store',
      });
      out.role_lookup_status = r.status;
      if (r.ok) { const rows = await r.json(); out.role_found = Array.isArray(rows) ? (rows[0]?.role || null) : null; }
    } catch (e) { out.role_lookup_error = String(e); }
  }

  return NextResponse.json(out);
}
