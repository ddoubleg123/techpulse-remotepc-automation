'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Returns true if the signed-in user has role='admin'. Reads the caller's own
 * users row with their token (RLS: auth.uid()=id), so no elevated key is used
 * and a non-admin can't spoof it. Result is cached in component state.
 */
export function useIsAdmin(): boolean {
  const token = useAuthStore((s) => s.token);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const t = useAuthStore.getState().token;
    if (!t || !SUPABASE_ANON_KEY) { setIsAdmin(false); return; }
    let cancelled = false;
    let sub = '';
    try {
      sub = JSON.parse(atob((t.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))).sub || '';
    } catch { /* not a JWT */ }
    if (!sub) { setIsAdmin(false); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=role`,
          { headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY } }
        );
        if (!res.ok) { if (!cancelled) setIsAdmin(false); return; }
        const rows = await res.json();
        const role = Array.isArray(rows) && rows[0] ? rows[0].role : null;
        if (!cancelled) setIsAdmin(role === 'admin');
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return isAdmin;
}
