// POST /api/admin-diagnostic
// Admin-only (Tier 3) diagnostic proxy.
//
// WHY THIS EXISTS:
//   The diagnostic chat normally authenticates as Tier 2 (technician) using the
//   public NEXT_PUBLIC_SYNTH_API_TOKEN, which ships in the client bundle. That is
//   fine for T2 — every web user is a technician. Tier 3 (admin) unlocks Mike's
//   private methodology/theories in the Synth prompt and MUST NOT be reachable by
//   a regular mechanic. So the T3 token can never live in the browser bundle.
//
// HOW IT STAYS SECURE:
//   1. The T3 token lives ONLY in a server-side env var (SYNTH_API_TOKEN_T3 —
//      note: NO NEXT_PUBLIC_ prefix, so it is never compiled into client JS).
//   2. Every request is identity-verified server-side via requireAdmin(), which
//      validates the caller's Supabase session (ES256 signature + expiry) and
//      requires role = 'admin' in the database. Fails closed on any error.
//   3. Only after that check does the server attach T3 and proxy to Synth.
//      A non-admin gets 403 and never touches T3.
//
// The browser calls this route with NO token; the cookie carries the identity.
// This route runs server-side, attaches T3, and streams the SSE response back.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

const SYNTH_API = 'https://techpulse-api.onrender.com';

export async function POST(req: NextRequest) {
  // 1. Identity gate — server-side, fails closed. Mechanics cannot pass this.
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: admin access required for Tier 3 diagnostics.' },
      { status: 403 }
    );
  }

  // 2. The T3 token is server-only. If it is not configured, do NOT silently
  //    fall back to a lower tier — fail loudly so misconfiguration is obvious.
  const T3 = process.env.SYNTH_API_TOKEN_T3 || '';
  if (!T3) {
    return NextResponse.json(
      { error: 'SYNTH_API_TOKEN_T3 not configured on the server.' },
      { status: 503 }
    );
  }

  // 3. Pass the caller's diagnostic payload straight through.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 4. Proxy to Synth with the T3 token attached server-side, streaming SSE back.
  let upstream: Response;
  try {
    upstream = await fetch(`${SYNTH_API}/api/diagnostic/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${T3}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Synth upstream failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: `Synth returned ${upstream.status}`, detail: detail.slice(0, 300) },
      { status: upstream.status }
    );
  }

  // 5. Stream the SSE body straight back to the admin client unchanged.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
