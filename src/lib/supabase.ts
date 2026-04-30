/**
 * Supabase client for the TechPulse web app.
 *
 * Per Locked Rule #6 (rescoped 2026-04-29), this client is for AUTH FLOW ONLY:
 *   - signInWithOAuth
 *   - exchangeCodeForSession
 *   - getSession / refreshSession
 *   - reading auth.user metadata
 *
 * NEVER use this client to read/write diagnostic data tables. All diagnostic
 * data writes (diagnostic_reports, diagnostic_case_studies, etc.) must go
 * through the Synth API using the T1 token.
 *
 * Added: 2026-04-30 as part of G4 Phase 1.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw at import time — the app may not need auth on every page render.
  // Throw at call time when getSupabaseClient() is invoked without env vars set.
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. ' +
    'Supabase auth will not work until these are set in Render env vars.'
  );
}

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client. Lazy-initialized so that pages that
 * don't need auth don't pay the import cost.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in Render dashboard for the web app service.'
    );
  }

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Persist session in localStorage (default), refresh access tokens automatically
      persistSession: true,
      autoRefreshToken: true,
      // Detect OAuth callback in URL on page load
      detectSessionInUrl: true,
      // PKCE flow is more secure for browser-based OAuth
      flowType: 'pkce',
    },
  });

  return _client;
}

/**
 * Convenience: starts the Google OAuth flow.
 * Returns void — Supabase will redirect the browser to Google's OAuth page.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(`Supabase Google OAuth failed: ${error.message}`);
  }
  // Browser is now redirecting to Google.
}

/**
 * Sign the user out of Supabase. Clears the session.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

/**
 * Returns the current Supabase session, or null if not signed in.
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[supabase] getSession error:', error);
    return null;
  }
  return data.session;
}
