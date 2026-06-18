import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OLD_HOST = 'techpulse-remotepc-automation.onrender.com';
const NEW_HOST = 'app.techpulse.dev';

// Cheap edge-side decode of a JWT's exp (no signature verification here — the
// admin layout does the authoritative signature + role check server-side).
function tokenIsUnexpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const payload = JSON.parse(atob(b64));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  // 1) Legacy host redirect (unchanged)
  const host = request.headers.get('host') || '';
  if (host === OLD_HOST) {
    const url = request.nextUrl.clone();
    url.host = NEW_HOST;
    return NextResponse.redirect(url, 308);
  }

  // 2) Admin gate (first filter). Real authorization (signature + role='admin')
  //    is enforced server-side in src/app/admin/layout.tsx. This just keeps
  //    unauthenticated/expired sessions out of /admin entirely.
  const path = request.nextUrl.pathname;
  if (path === '/admin' || path.startsWith('/admin/')) {
    const token = request.cookies.get('tp_at')?.value || '';
    if (!token || !tokenIsUnexpired(token)) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      url.search = '';
      return NextResponse.redirect(url, 302);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
