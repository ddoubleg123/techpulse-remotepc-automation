/**
 * /auth/callback â Supabase OAuth redirect handler.
 *
 * Flow:
 *   1. User clicks "Sign in with Google" â supabase.auth.signInWithOAuth()
 *   2. Browser redirects to Google â user approves
 *   3. Google redirects to Supabase â Supabase completes the OAuth handshake
 *   4. Supabase redirects browser HERE with ?code=<auth_code>
 *   5. We call exchangeCodeForSession(code) to get the access token + user
 *   6. Hydrate Zustand store via signIn(user, token), redirect to /app
 *
 * Phase 1 note: This page is ADDITIVE. The existing sync-api flow at
 * /auth/login still works. Phase 2 will switch the login button to use
 * Supabase. Phase 4 will retire sync-api entirely.
 *
 * Added: 2026-04-30 as part of G4 Phase 1.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setErrorMsg(errorDescription || errorParam);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMsg('Missing auth code in callback URL.');
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          throw new Error(error?.message || 'No session returned from Supabase');
        }

        // Hydrate the Zustand auth store. authStore.signIn signature is
        // signIn(user: User, token: string) where User has shape:
        //   { id: string; email: string; name: string; hasPaymentMethodOnFile: boolean }
        const supabaseUser = data.session.user;
        const user = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name:
            (supabaseUser.user_metadata?.full_name as string | undefined) ||
            (supabaseUser.user_metadata?.name as string | undefined) ||
            supabaseUser.email ||
            '',
          // Default until we wire the billing/payment-method check in Phase 2/3
          hasPaymentMethodOnFile: false,
        };

        useAuthStore.getState().signIn(user, data.session.access_token);

        router.replace('/app');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[auth/callback] Failed:', msg);
        setStatus('error');
        setErrorMsg(msg);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#c00' }}>Sign-in failed</h1>
        <p>{errorMsg}</p>
        <p>
          <a href="/auth/login" style={{ color: '#06c' }}>
            Try again
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <p>Signing you inâ¦</p>
    </div>
  );
}

