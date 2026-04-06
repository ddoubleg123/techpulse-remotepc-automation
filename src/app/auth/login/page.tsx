'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const AUTH_API = 'https://techpulse-sync-api.onrender.com';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already logged in -> go to app
  useEffect(() => { if (user) router.push('/app'); }, [user, router]);

  // Auth API redirects back here with ?token=...&email=... after Google OAuth
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const token = p.get('token');
    const em = p.get('email');
    if (token && em) {
      try {
        const pl = JSON.parse(atob(token));
        signIn({ id: pl.userId || '1', email: em, name: em.split('@')[0], hasPaymentMethodOnFile: false }, token);
        router.push('/app');
      } catch { setError('Authentication failed. Please try again.'); }
    }
  }, [router, signIn]);

  // Route through auth API - never call Google directly
  const handleGoogle = () => { window.location.href = AUTH_API + '/api/auth/google'; };

  const handleSendOtp = async () => {
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(AUTH_API + '/api/auth/email/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (res.ok) { setOtpSent(true); if (d.debug?.otp) setOtp(d.debug.otp); }
      else setError(d.message || 'Failed to send OTP');
    } catch { setError('Network error — please try again'); } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Please enter the OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(AUTH_API + '/api/auth/email/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const d = await res.json();
      if (res.ok && d.token) { signIn(d.user, d.token); router.push('/app'); }
      else setError(d.message || 'Invalid OTP');
    } catch { setError('Network error — please try again'); } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const primaryBtn: React.CSSProperties = { width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '40px 36px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,195,255,0.35)' }}>
            <svg viewBox="0 0 48 28" fill="none" style={{ width: 26, height: 16 }}>
              <polyline points="0,14 10,14 14,4 17,24 20,14 24,2 27,22 30,14 34,14 37,8 39,20 41,14 48,14" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>TechPulse</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,195,255,0.65)', letterSpacing: '0.08em' }}>AI DIAGNOSTICS</div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>Sign in</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 28px' }}>Access your diagnostic dashboard</p>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#f87171' }}>{error}</div>
        )}

        {!otpSent ? (
          <>
            <input type="email" placeholder="Enter your email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              style={{ ...inp, marginBottom: 12 }} />
            <button onClick={handleSendOtp} disabled={loading}
              style={{ ...primaryBtn, marginBottom: 20, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
              OTP sent to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
            </p>
            <input type="text" placeholder="6-digit OTP" value={otp} maxLength={6}
              onChange={e => { setOtp(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              style={{ ...inp, marginBottom: 12, fontSize: 20, letterSpacing: '0.25em', textAlign: 'center' }} />
            <button onClick={handleVerifyOtp} disabled={loading}
              style={{ ...primaryBtn, marginBottom: 10, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
            <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
              style={{ width: '100%', padding: '10px', borderRadius: 12, marginBottom: 20, background: 'transparent', border: '1px solid var(--border-input)', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
              Back
            </button>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-card)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-card)' }} />
        </div>

        <button onClick={handleGoogle}
          style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
