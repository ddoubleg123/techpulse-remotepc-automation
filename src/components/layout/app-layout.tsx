'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import Header from './header';
import DemoBanner from '@/components/DemoBanner';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { isDemoUser } from '@/lib/demoUsers';
import { captureReferralCode } from '@/lib/referralCapture';
import { track } from '@/lib/track';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getTokenExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (p.length % 4) p += '=';
    const payload = JSON.parse(atob(p));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

type RefreshResult =
  | { ok: true; access_token: string; refresh_token?: string }
  | { ok: false; dead: boolean }; // dead=true => refresh token is invalid/expired (sign out)

async function refreshSupabaseToken(refreshToken: string): Promise<RefreshResult> {
  if (!refreshToken || !SUPABASE_ANON_KEY) return { ok: false, dead: true };
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      // 400/401/403 => the refresh token itself is bad; anything else is transient.
      const dead = res.status === 400 || res.status === 401 || res.status === 403;
      console.warn('Supabase token refresh failed:', res.status, dead ? '(session dead)' : '(transient)');
      return { ok: false, dead };
    }
    const data = await res.json();
    if (data.access_token) return { ok: true, access_token: data.access_token, refresh_token: data.refresh_token };
    return { ok: false, dead: true };
  } catch (e) {
    console.error('Supabase token refresh error', e);
    return { ok: false, dead: false }; // network error: don't nuke the session
  }
}

// Mirror the access token into a cookie so server-side middleware can read it
// (localStorage is not visible to middleware). This is the same token already in
// localStorage — no new exposure; the service-role key is never in the browser.
function setAuthCookie(token: string) {
  if (typeof document === 'undefined' || !token) return;
  // session cookie, scoped to the app, sent on same-site navigations
  document.cookie = `tp_at=${token}; Path=/; SameSite=Lax; Secure`;
}
function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'tp_at=; Path=/; Max-Age=0; SameSite=Lax; Secure';
}

// Clear the session and bounce to login when the refresh token is dead.
function forceSignOut() {
  try {
    localStorage.removeItem('supabase-refresh-token');
  } catch { /* ignore */ }
  clearAuthCookie();
  try {
    useAuthStore.getState().signOut();
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
    window.location.href = '/auth/login';
  }
}

// App-wide onboarding gate: forces any signed-in, non-demo user WITHOUT a shop
// (or who hasn't completed onboarding) into the onboarding flow, on EVERY /app/* route
// — not just the dashboard. Renders nothing until the profile has loaded, to avoid a
// flash before data arrives.
function OnboardingGate() {
  const { user } = useAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = useAuthStore.getState().token;
    if (!user || !token || !SUPABASE_ANON_KEY) { setLoaded(false); return; }
    if (isDemoUser(user)) { setNeedsOnboarding(false); setLoaded(true); return; }

    let sub = '';
    try { sub = JSON.parse(atob((token.split('.')[1] || '').replace(/-/g,'+').replace(/_/g,'/'))).sub || ''; } catch { /* not a JWT */ }
    if (!sub) {
      // All auth (Google + email OTP) now goes through real Supabase auth, so a
      // valid session always carries a sub. Reaching here means the token isn't a
      // usable Supabase JWT — don't show onboarding (the shop-assign RPC needs a
      // Supabase JWT); the session/refresh logic will handle re-auth if needed.
      if (!cancelled) { setNeedsOnboarding(false); setLoaded(true); }
      return;
    }

    fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=role,onboarding_completed,shop_id,first_name,last_name,name,full_name,business_name,address,business_address,phone,photo_url,shops(shop_name,address,phone)`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.ok ? r.json() : null)
      .then(rows => {
        if (cancelled) return;
        const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
        // Gate if the account is missing ANY required info. Everything but email
        // is collected/confirmed in onboarding. If the read fails (row null), do
        // NOT gate — avoid locking users out on a transient error.
        if (row) {
          // Admins and developers are internal accounts, not shop customers —
          // they never go through customer onboarding.
          const role = (row.role || '').toLowerCase();
          if (role === 'admin' || role === 'developer') {
            setNeedsOnboarding(false);
            setLoaded(true);
            return;
          }
          // The linked shop record (if any) provides fallback prefill values so a
          // user who already has a shop sees its name/address/phone pre-filled and
          // only fills genuine gaps.
          const shop = row.shops && !Array.isArray(row.shops) ? row.shops
                     : (Array.isArray(row.shops) && row.shops[0]) ? row.shops[0] : null;
          // Make the known values available to the modal so it pre-fills and the
          // user only completes the gaps.
          useAuthStore.setState((state: any) => ({
            user: state.user ? {
              ...state.user,
              first_name: row.first_name ?? state.user.first_name,
              last_name: row.last_name ?? state.user.last_name,
              name: row.name ?? row.full_name ?? state.user.name,
              business_name: row.business_name ?? (shop?.shop_name) ?? state.user.business_name,
              shop_name: (shop?.shop_name) ?? state.user.shop_name,
              address: row.address ?? row.business_address ?? (shop?.address) ?? state.user.address,
              phone: row.phone ?? (shop?.phone) ?? state.user.phone,
            } : state.user,
          }));
          // Account is complete only when every required field is present AND
          // non-blank. Mirrors public.account_is_complete() so the gate, the DB,
          // and any future client agree on one definition.
          const nonBlank = (v: any) => typeof v === 'string' && v.trim() !== '';
          const hasName = nonBlank(row.first_name) || nonBlank(row.name) || nonBlank(row.full_name);
          const hasBusiness = nonBlank(row.business_name);
          const hasAddress = nonBlank(row.address) || nonBlank(row.business_address);
          const hasPhone = nonBlank(row.phone);
          const incomplete =
            !row.onboarding_completed ||
            !row.shop_id ||
            !hasName ||
            !hasBusiness ||
            !hasAddress ||
            !hasPhone;
          setNeedsOnboarding(incomplete);
        }
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [user]);

  if (!user || !loaded || !needsOnboarding) return null;
  return <OnboardingModal />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn } = useAuthStore();

  useEffect(() => {
    captureReferralCode();
  }, []);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = (token: string, refreshToken: string) => {
      if (!refreshToken || !SUPABASE_ANON_KEY) return;
      const exp = getTokenExp(token);
      if (!exp) return;
      const secUntilExp = exp - Math.floor(Date.now() / 1000);
      const refreshInMs = Math.max(1000, (secUntilExp - 300) * 1000);
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        const result = await refreshSupabaseToken(refreshToken);
        if (!result.ok) {
          if (result.dead) forceSignOut();
          return;
        }
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        const nextRefresh = result.refresh_token || refreshToken;
        if (result.refresh_token) {
          localStorage.setItem('supabase-refresh-token', result.refresh_token);
        }
        signIn(currentUser, result.access_token);
        setAuthCookie(result.access_token);
        scheduleRefresh(result.access_token, nextRefresh);
      }, refreshInMs);
    };

    // Supabase OAuth callback (hash fragment) — for Google sign-in
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#access_token=')) {
      try {
        const h = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = h.get('access_token');
        const refreshToken = h.get('refresh_token');
        if (accessToken) {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payloadB64.length % 4) payloadB64 += '=';
            const payload = JSON.parse(atob(payloadB64));
            const email = payload.email || '';
            const id = payload.sub || '1';
            if (refreshToken) {
              localStorage.setItem('supabase-refresh-token', refreshToken);
            }
            signIn({ id, email, name: email.split('@')[0], hasPaymentMethodOnFile: false }, accessToken);
            track({ event_type: 'login', payload: { method: 'google' } });
            setAuthCookie(accessToken);
            if (refreshToken) scheduleRefresh(accessToken, refreshToken);
            window.history.replaceState({}, '', window.location.pathname);
            return () => { if (refreshTimer) clearTimeout(refreshTimer); };
          }
        }
      } catch (e) {
        console.error('Supabase callback parse failed', e);
      }
    }

    // Legacy sync-api callback (query string) — email OTP still uses this
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    if (token && email) {
      signIn({ id: '1', email, name: email.split('@')[0], hasPaymentMethodOnFile: false }, token);
      track({ event_type: 'login', payload: { method: 'otp' } });
      setAuthCookie(token);
      window.history.replaceState({}, '', window.location.pathname);
      return () => { if (refreshTimer) clearTimeout(refreshTimer); };
    }

    // Existing session: refresh Supabase token if expiring soon
    try {
      const stored = localStorage.getItem('auth-storage');
      const auth = stored ? JSON.parse(stored) : null;
      const existingToken = auth?.state?.token;
      const existingRefresh = localStorage.getItem('supabase-refresh-token');
      // Keep the middleware-readable cookie in sync with the current token,
      // so already-signed-in users (no refresh needed) are still gated correctly.
      if (existingToken) {
        const exp0 = getTokenExp(existingToken);
        if (exp0 && exp0 > Math.floor(Date.now() / 1000)) setAuthCookie(existingToken);
      }
      if (existingToken && existingRefresh) {
        const exp = getTokenExp(existingToken);
        if (exp) {
          const secUntilExp = exp - Math.floor(Date.now() / 1000);
          if (secUntilExp < 300) {
            (async () => {
              const result = await refreshSupabaseToken(existingRefresh);
              if (!result.ok) {
                if (result.dead) forceSignOut();
                return;
              }
              const currentUser = useAuthStore.getState().user;
              if (!currentUser) return;
              const nextRefresh = result.refresh_token || existingRefresh;
              if (result.refresh_token) {
                localStorage.setItem('supabase-refresh-token', result.refresh_token);
              }
              signIn(currentUser, result.access_token);
              setAuthCookie(result.access_token);
              scheduleRefresh(result.access_token, nextRefresh);
            })();
          } else {
            scheduleRefresh(existingToken, existingRefresh);
          }
        }
      }
    } catch (e) {
      console.error('Supabase token refresh check failed', e);
    }

    return () => { if (refreshTimer) clearTimeout(refreshTimer); };
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-page)' }}>
      <Sidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0, overflow:'hidden' }}>
        <DemoBanner />
        <Header />
        <main style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          {children}
        </main>
      </div>
      <OnboardingGate />
    </div>
  );
}

