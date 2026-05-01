/**
 * Referral code capture
 *
 * Add this to:
 *   1. The marketing site root layout (techpulse.dev) — so /?ref=daniel-9k3xq captures
 *   2. The web app root layout (techpulse-remotepc-automation) — for direct app links
 *
 * On any page load with ?ref={code}, store the code in localStorage. The billing
 * page reads from localStorage when the user reaches checkout, so the code
 * survives Google OAuth round-trips and any number of intermediate page loads.
 *
 * Storage key matches what the billing page reads: 'techpulse_pending_referral'
 *
 * Usage in a Next.js layout.tsx (client component):
 *
 *   'use client';
 *   import { useEffect } from 'react';
 *   import { captureReferralCode } from '@/lib/referralCapture';
 *
 *   useEffect(() => { captureReferralCode(); }, []);
 */

const REFERRAL_STORAGE_KEY = 'techpulse_pending_referral';
const REFERRAL_TIMESTAMP_KEY = 'techpulse_pending_referral_at';
const REFERRAL_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export function captureReferralCode(): void {
  if (typeof window === 'undefined') return;

  // Read from URL
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref');
  if (!code) {
    // Also check if the existing stored code is stale and clean it up
    pruneIfStale();
    return;
  }

  // Validate format: alphanum + hyphens, 3-40 chars
  if (!/^[a-zA-Z0-9-]{3,40}$/.test(code)) return;

  // Don't overwrite an existing valid code unless this one came from a click
  // (this is the typical case — first-touch attribution)
  const existing = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (existing && existing !== code) {
    // Honor first-touch: keep the original
    return;
  }

  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  localStorage.setItem(REFERRAL_TIMESTAMP_KEY, String(Date.now()));
}

function pruneIfStale(): void {
  if (typeof window === 'undefined') return;
  const ts = localStorage.getItem(REFERRAL_TIMESTAMP_KEY);
  if (!ts) return;
  const age = Date.now() - parseInt(ts, 10);
  if (age > REFERRAL_TTL_MS) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_TIMESTAMP_KEY);
  }
}
