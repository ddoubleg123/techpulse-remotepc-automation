import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
export async function GET() {
  const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const out: Record<string, unknown> = { anon_present: !!ANON_KEY, anon_len: ANON_KEY.length };
  const c = await cookies();
  const token = c.get('tp_at')?.value || '';
  out.cookie_present = !!token;
  if (token && ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY }, cache: 'no-store' });
      out.auth_status = r.status;
      if (r.ok) { const u = await r.json(); out.sub = u?.id || null; }
    } catch (e) { out.auth_err = String(e); }
  }
  if (token && ANON_KEY && out.sub) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(String(out.sub))}&select=id,email,role`, { headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY }, cache: 'no-store' });
      out.role_read_status = r.status;
      if (r.ok) { const rows = await r.json(); out.row_count = Array.isArray(rows)?rows.length:0; out.role = Array.isArray(rows)&&rows[0]?rows[0].role:null; }
      else { out.role_read_body = (await r.text()).slice(0,200); }
    } catch (e) { out.role_err = String(e); }
  }
  return NextResponse.json(out);
}
