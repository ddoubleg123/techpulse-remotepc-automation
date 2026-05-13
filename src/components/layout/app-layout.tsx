'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import Sidebar from './sidebar';
import Header from './header';
import { captureReferralCode } from '@/lib/referralCapture';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn } = useAuthStore();

  useEffect(() => {
    captureReferralCode();
  }, []);

  useEffect(() => {
    // Supabase OAuth callback (hash fragment) — for Google sign-in
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#access_token=')) {
      try {
        const h = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = h.get('access_token');
        if (accessToken) {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payloadB64.length % 4) payloadB64 += '=';
            const payload = JSON.parse(atob(payloadB64));
            const email = payload.email || '';
            const id = payload.sub || '1';
            signIn({ id, email, name: email.split('@')[0], hasPaymentMethodOnFile: false }, accessToken);
            window.history.replaceState({}, '', window.location.pathname);
            return;
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
    }
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-page)' }}>
      <Sidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0, overflow:'hidden' }}>
        <Header />
        <main style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

