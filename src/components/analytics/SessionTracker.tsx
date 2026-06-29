'use client';

// SessionTracker — emits session-lifecycle and route-view events so we can answer
// "who was on the site, how long, and what did they do."
//
// Events emitted (all carry the TECH-... session_id from getOrCreateSessionUnid):
//   session_started   — once per tab session (first mount after a fresh load)
//   page_view         — on every route/path change
//   session_heartbeat — every HEARTBEAT_MS while the tab is visible
//   session_ended     — on tab hide / pagehide (best-effort, keepalive)
//
// Duration is reconstructed server-side as max(created_at) - min(created_at) per
// session_id (see v_session_durations), so an idle reader on a report still
// accrues time as long as heartbeats fire. Heartbeats pause when the tab is
// hidden to avoid counting time the user isn't actually looking at the app.
//
// This renders nothing. It's mounted once in app-layout, inside the authed shell.

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';
import { getOrCreateSessionUnid } from '@/lib/unid';

const HEARTBEAT_MS = 30_000; // 30s cadence; tune with real traffic

export default function SessionTracker() {
  const pathname = usePathname();
  const startedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session start (once per tab session) + heartbeat loop + lifecycle handlers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sid = getOrCreateSessionUnid();

    // Fire session_started only once per actual page load. We use a per-tab flag
    // in sessionStorage so a client-side remount (e.g. fast refresh, layout
    // re-render) doesn't double-count, but a genuine new tab/load does.
    let isNewSession = false;
    try {
      if (!window.sessionStorage.getItem('tp-session-open')) {
        window.sessionStorage.setItem('tp-session-open', sid);
        isNewSession = true;
      }
    } catch {
      isNewSession = !startedRef.current;
    }

    if (isNewSession && !startedRef.current) {
      startedRef.current = true;
      track({ event_type: 'session_started', session_id: sid, payload: { entry_path: window.location.pathname } });
    }

    const beat = () => {
      if (document.visibilityState === 'visible') {
        track({ event_type: 'session_heartbeat', session_id: sid });
      }
    };
    timerRef.current = setInterval(beat, HEARTBEAT_MS);

    const endSession = () => {
      track({ event_type: 'session_ended', session_id: sid });
    };

    // visibilitychange covers tab switches and most mobile backgrounding;
    // pagehide covers actual unload/navigation-away more reliably than unload.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') endSession();
    };
    window.addEventListener('pagehide', endSession);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('pagehide', endSession);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Route/page views — fire on every distinct path.
  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    const sid = getOrCreateSessionUnid();
    track({ event_type: 'page_view', session_id: sid, payload: { path: pathname } });
  }, [pathname]);

  return null;
}
