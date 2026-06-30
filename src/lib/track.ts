// track.ts — append-only client event logging for "what did this user do".
//
// Why this exists: chat_sessions writes require a Supabase `sub` decoded from
// the token (`if (!_selfId) return`). Email-OTP users whose token isn't a real
// Supabase JWT therefore write NOTHING — they are invisible. This logger never
// drops an event: it captures user_id when we have it, but always falls back to
// email + session_id so OTP-only and shopless users still produce a timeline.
//
// Fire-and-forget. Never throws, never blocks UI. Mirrors the auth-header
// pattern in sessionHistory.ts (Bearer <user token or anon>, apikey: anon).

import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export type EventType =
  | 'login'
  | 'scan_started'
  | 'pdf_uploaded'
  | 'codes_entered'
  | 'synth_message_sent'
  | 'report_generated'
  | 'feedback_submitted'
  | 'session_started'
  | 'session_heartbeat'
  | 'session_ended'
  | 'page_view';

interface TrackInput {
  event_type: EventType;
  step?: string;
  session_id?: string;
  vehicle?: string;
  dtc_codes?: string[];
  shop_id?: string | null;
  payload?: Record<string, unknown>;
  source?: 'web' | 'mobile';
}

function subFromToken(token: string): string {
  try {
    return (
      JSON.parse(
        atob((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))
      ).sub || ''
    );
  } catch {
    return '';
  }
}

/**
 * Append one event. Best-effort: resolves whatever attribution is available
 * and writes a row. Safe to call anywhere; failures are swallowed.
 */
export function track(input: TrackInput): void {
  try {
    if (!SUPABASE_ANON_KEY) return;
    const token = useAuthStore.getState().token || '';
    const user = useAuthStore.getState().user as
      | { email?: string; shop_id?: string }
      | null;

    const user_id = token ? subFromToken(token) : '';
    const user_email = (user && user.email) || '';
    // Resolve shop_id: prefer an explicit value, else read it off the auth store.
    // Without this, gate-relevant events (report_generated) land with shop_id=NULL
    // and the trial gate — which counts by shop — can't see them.
    const shop_id = input.shop_id ?? (user && user.shop_id) ?? null;

    // Don't bother writing a totally anonymous row with no signal at all.
    if (!user_id && !user_email && !input.session_id) return;

    const body = {
      user_id: user_id || null,
      user_email: user_email || null,
      shop_id: shop_id,
      session_id: input.session_id ?? null,
      event_type: input.event_type,
      step: input.step ?? null,
      vehicle: input.vehicle ?? null,
      dtc_codes: input.dtc_codes ?? null,
      source: input.source ?? 'web',
      payload: input.payload ?? {},
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      path: typeof window !== 'undefined' ? window.location.pathname : null,
    };

    // Use the user token when present (so user_id = auth.uid() lines up for the
    // self-read policy); fall back to anon key for OTP-only sessions. Either way
    // the permissive insert policy lets the row land.
    fetch(SUPABASE_URL + '/rest/v1/user_events', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (token || SUPABASE_ANON_KEY),
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
      keepalive: true, // survive navigation/unload (e.g. login redirect)
    }).catch(() => {});
  } catch {
    /* tracking is never allowed to break the app */
  }
}
