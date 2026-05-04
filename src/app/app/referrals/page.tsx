'use client';

/**
 * Referrals page — shows the user's share URL, list of pending and credited
 * referrals, and total credits earned.
 *
 * Backend: /api/referrals/me on the connector. See SIDD_SPEC_BILLING_REFERRALS.md
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

const CONNECTOR_BASE = 'https://techpulse-app.onrender.com';

type Referral = {
  id: string;
  referee_email_masked: string;
  status: 'pending' | 'credited' | 'voided';
  signup_at: string;
  credited_at?: string;
  credit_amount_cents?: number;
};

type ReferralsState = {
  code: string;
  share_url: string;
  stats: {
    pending_count: number;
    credited_count: number;
    total_credit_cents: number;
    total_credit_display: string;
  };
  referrals: Referral[];
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReferralsPage() {
  const { token } = useAuthStore();
  const [state, setState] = useState<ReferralsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${CONNECTOR_BASE}/api/referrals/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setState(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function copyShareUrl() {
    if (!state) return;
    navigator.clipboard.writeText(state.share_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function emailShare() {
    if (!state) return;
    const subject = 'Try TechPulse — first month free for both of us';
    const body = `Hey,\n\nI've been using TechPulse to handle the diagnostic side of my shop and it's been a real time-saver. Mike Munson built it — 45 years of experience as a master tech, and the AI is trained on his actual case files.\n\nSign up through this link and you get your first month free. If you stick with it, I get a free month too.\n\n${state.share_url}\n\n— ${'sent from TechPulse'}\n`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Referrals</h1>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: 16, borderRadius: 8 }}>
          Could not load referrals: {error}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Referrals</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Refer a shop, get a free month</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15 }}>
        When a shop you refer pays their first month, you get one full month of TechPulse free.
        Credit applies to your next invoice automatically. No limits.
      </p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{state.stats.pending_count}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>signed up, not yet paid</div>
        </div>
        <div style={{ background: '#dcfce7', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credited</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#166534' }}>{state.stats.credited_count}</div>
          <div style={{ fontSize: 12, color: '#166534' }}>paid first month</div>
        </div>
        <div style={{ background: '#0f172a', color: '#fff', padding: 16, borderRadius: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earned</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{state.stats.total_credit_display}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>applied to invoices</div>
        </div>
      </div>

      {/* Share box */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Your referral link</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            readOnly
            value={state.share_url}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              background: '#f8fafc',
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={copyShareUrl}
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              border: 'none',
              background: copied ? '#22c55e' : '#0f172a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: 90,
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <button
          onClick={emailShare}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#0f172a',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Share via email
        </button>
      </div>

      {/* Referrals list */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Your referrals</div>
        {state.referrals.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 14, padding: '12px 0' }}>
            No referrals yet. Share your link to start earning credit.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                  SHOP
                </th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                  SIGNED UP
                </th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                  STATUS
                </th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                  CREDIT
                </th>
              </tr>
            </thead>
            <tbody>
              {state.referrals.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 0', fontSize: 14 }}>{r.referee_email_masked}</td>
                  <td style={{ padding: '10px 0', fontSize: 14, color: '#64748b' }}>{formatDate(r.signup_at)}</td>
                  <td style={{ padding: '10px 0', fontSize: 13 }}>
                    {r.status === 'credited' && (
                      <span style={{ color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 12 }}>
                        Credited
                      </span>
                    )}
                    {r.status === 'pending' && (
                      <span style={{ color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
                        Pending
                      </span>
                    )}
                    {r.status === 'voided' && (
                      <span style={{ color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12 }}>
                        Trial expired
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 0', fontSize: 14, textAlign: 'right' }}>
                    {r.credit_amount_cents ? dollars(r.credit_amount_cents) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* How it works */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginTop: 24, fontSize: 14, color: '#475569' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>How it works</div>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 4 }}>Share your link with a shop owner or technician.</li>
          <li style={{ marginBottom: 4 }}>They sign up and start their 30-day free trial.</li>
          <li style={{ marginBottom: 4 }}>When their first paid invoice posts, you earn one month of credit at your current plan rate.</li>
          <li>The credit applies to your next invoice automatically. Surplus rolls forward.</li>
        </ol>
      </div>
    </div>
  );
}
