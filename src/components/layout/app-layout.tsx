'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import Sidebar from './sidebar';
import Header from './header';
import DemoBanner from '@/components/DemoBanner';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { isDemoUser } from '@/lib/demoUsers';
import { captureReferralCode } from '@/lib/referralCapture';

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

async function refreshSupabaseToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string } | null> {
  if (!refreshToken || !SUPABASE_ANON_KEY) return null;
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
      console.warn('Supabase token refresh failed:', res.status);
      return null;
    }
    const data = await res.json();
    return data.access_token ? data : null;
  } catch (e) {
    console.error('Supabase token refresh error', e);
    return null;
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
      // No Supabase sub (legacy / email-OTP token). These users can't complete the
      // shop-assign RPC (it needs a Supabase JWT), and per MVP decision OTP users are
      // allowed through without history. Do NOT gate them — that would be an unescapable loop.
      if (!cancelled) { setNeedsOnboarding(false); setLoaded(true); }
      return;
    }

    fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=onboarding_completed,shop_id`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.ok ? r.json() : null)
      .then(rows => {
        if (cancelled) return;
        const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
        // Gate if we can read the row and it shows no shop / not completed.
        // If the read fails (row null), do NOT gate — avoid locking users out on a transient error.
        if (row) setNeedsOnboarding(!row.onboarding_completed || !row.shop_id);
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
        const newTokens = await refreshSupabaseToken(refreshToken);
        if (!newTokens) return;
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        const nextRefresh = newTokens.refresh_token || refreshToken;
        if (newTokens.refresh_token) {
          localStorage.setItem('supabase-refresh-token', newTokens.refresh_token);
        }
        signIn(currentUser, newTokens.access_token);
        scheduleRefresh(newTokens.access_token, nextRefresh);
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
      window.history.replaceState({}, '', window.location.pathname);
      return () => { if (refreshTimer) clearTimeout(refreshTimer); };
    }

    // Existing session: refresh Supabase token if expiring soon
    try {
      const stored = localStorage.getItem('auth-storage');
      const auth = stored ? JSON.parse(stored) : null;
      const existingToken = auth?.state?.token;
      const existingRefresh = localStorage.getItem('supabase-refresh-token');
      if (existingToken && existingRefresh) {
        const exp = getTokenExp(existingToken);
        if (exp) {
          const secUntilExp = exp - Math.floor(Date.now() / 1000);
          if (secUntilExp < 300) {
            (async () => {
              const newTokens = await refreshSupabaseToken(existingRefresh);
              if (!newTokens) return;
              const currentUser = useAuthStore.getState().user;
              if (!currentUser) return;
              const nextRefresh = newTokens.refresh_token || existingRefresh;
              if (newTokens.refresh_token) {
                localStorage.setItem('supabase-refresh-token', newTokens.refresh_token);
              }
              signIn(currentUser, newTokens.access_token);
              scheduleRefresh(newTokens.access_token, nextRefresh);
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

