'use client';

/**
 * Billing page — renders plans from /api/billing/plans, supports per-card
 * subscribe button, mechanic count selector, "first month free" trial display,
 * and referral code application.
 *
 * Replaces the previous hardcoded-fallback version. Ships as part of:
 *   feat(billing): per-seat pricing + referral support + free-trial UI
 *
 * Backend contract: see SIDD_SPEC_BILLING_REFERRALS.md
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { isDemoUser } from '@/lib/demoUsers';

const CONNECTOR_BASE = 'https://techpulse-app.onrender.com';

type PriceFragment = {
  lookup_key: string;
  amount_cents: number;
  currency: string;
  interval: string;
};

type Plan = {
  id: 'automated' | 'automated_human';
  name: string;
  tagline: string;
  base: PriceFragment;
  seat: PriceFragment;
  trial_days: number;
  features: string[];
  most_popular: boolean;
};

const REFERRAL_STORAGE_KEY = 'techpulse_pending_referral';

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function readPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

export default function BillingPage() {
  const { token, user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mechanicCounts, setMechanicCounts] = useState<Record<string, number>>({
    automated: 1,
    automated_human: 1,
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState<{ valid: boolean; referrer_name?: string; reason?: string } | null>(null);

  // Load plans
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${CONNECTOR_BASE}/api/billing/plans`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (!data.plans || data.plans.length === 0) {
            setError("Plans aren't configured on the backend yet. Try again in a few minutes.");
          } else {
            setPlans(data.plans);
          }
        }
      } catch (err) {
        if (!cancelled) setError(`Could not load plans: ${(err as Error).message}`);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Read pending referral code from localStorage and validate it
  useEffect(() => {
    const code = readPendingReferralCode();
    if (!code) return;
    setReferralCode(code);
    fetch(`${CONNECTOR_BASE}/api/referrals/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((data) => setReferralValid(data))
      .catch(() => setReferralValid({ valid: false, reason: 'network_error' }));
  }, [token]);

  function setMechanics(planId: string, count: number) {
    setMechanicCounts((prev) => ({ ...prev, [planId]: Math.max(1, Math.min(50, count)) }));
  }

  function totalForPlan(plan: Plan): number {
    const mechanics = mechanicCounts[plan.id] ?? 1;
    const baseCents = plan.base.amount_cents;
    const seatCents = plan.seat.amount_cents;
    return baseCents + seatCents * Math.max(0, mechanics - 1);
  }

  async function subscribe(plan: Plan) {
    if (submitting) return;
    setSubmitting(plan.id);
    try {
      const body: Record<string, unknown> = {
        plan: plan.id,
        mechanics: mechanicCounts[plan.id] ?? 1,
      };
      if (referralValid?.valid && referralCode) {
        body.referral_code = referralCode;
      }
      const res = await fetch(`${CONNECTOR_BASE}/api/billing/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Checkout failed (${res.status}): ${errBody.slice(0, 200)}`);
      }
      const data = await res.json();
      if (data.url) {
        // Clear the pending referral code now that it's been applied
        if (referralValid?.valid) localStorage.removeItem(REFERRAL_STORAGE_KEY);
        window.location.href = data.url;
      } else {
        throw new Error('Checkout response missing url');
      }
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(null);
    }
  }

  // Demo accounts see a static "active subscription" view instead of the plan picker.
  if (isDemoUser(user)) {
    return (
      <div style={{ padding: 32, maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>Billing</h1>
        <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', padding: 24, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#14532d' }}>Pro Plan</div>
              <div style={{ marginTop: 6, color: '#15803d', fontSize: 14 }}>Active &middot; Renews January 1, 2099</div>
            </div>
            <div style={{ background: '#16a34a', color: 'white', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>ACTIVE</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #bbf7d0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><div style={{ fontSize: 12, color: '#666' }}>Monthly</div><div style={{ fontSize: 18, fontWeight: 600 }}>$375.00</div></div>
            <div><div style={{ fontSize: 12, color: '#666' }}>Next charge</div><div style={{ fontSize: 18, fontWeight: 600 }}>Jan 1, 2099</div></div>
          </div>
        </div>
        <p style={{ marginTop: 20, color: '#666', fontSize: 13, fontStyle: 'italic' }}>Demo account &mdash; billing data is illustrative only.</p>
      </div>
    );
  }

  if (error && !plans) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Billing</h1>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: 16, borderRadius: 8 }}>
          <strong>Could not load billing.</strong>
          <p style={{ marginTop: 8 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!plans) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Billing</h1>
        <p>Loading plans...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Choose your plan</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Every plan includes 1 mechanic. Add more for {dollars(plans[0]?.seat.amount_cents ?? 2500)}/month each.
        First month free, cancel anytime.
      </p>

      {referralValid?.valid && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#166534',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          ✓ Referred by <strong>{referralValid.referrer_name}</strong>. Thanks for the introduction!
        </div>
      )}

      {error && plans && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {plans.map((plan) => {
          const mechanics = mechanicCounts[plan.id] ?? 1;
          const totalCents = totalForPlan(plan);
          const isHighlight = plan.most_popular;
          const isSubmitting = submitting === plan.id;

          return (
            <div
              key={plan.id}
              style={{
                background: isHighlight ? '#0f172a' : '#fff',
                color: isHighlight ? '#fff' : '#0f172a',
                borderRadius: 12,
                padding: 24,
                border: isHighlight ? 'none' : '1px solid #e2e8f0',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.most_popular && (
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  Most Popular
                </span>
              )}
              <div style={{ fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {dollars(plan.base.amount_cents)}
                <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>{plan.tagline}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
                First month free, then {dollars(plan.base.amount_cents)}/mo. Cancel anytime.
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ padding: '4px 0', fontSize: 14 }}>
                    <span style={{ color: '#22c55e', marginRight: 8 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, opacity: 0.85 }}>
                Number of mechanics
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => setMechanics(plan.id, mechanics - 1)}
                  disabled={mechanics <= 1}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    background: isHighlight ? '#1e293b' : '#f1f5f9',
                    color: 'inherit',
                    cursor: mechanics <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: 18,
                    opacity: mechanics <= 1 ? 0.4 : 1,
                  }}
                  aria-label="decrease mechanics"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={mechanics}
                  onChange={(e) => setMechanics(plan.id, parseInt(e.target.value) || 1)}
                  style={{
                    width: 60,
                    height: 32,
                    textAlign: 'center',
                    borderRadius: 6,
                    border: 'none',
                    background: isHighlight ? '#1e293b' : '#f1f5f9',
                    color: 'inherit',
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={() => setMechanics(plan.id, mechanics + 1)}
                  disabled={mechanics >= 50}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    background: isHighlight ? '#1e293b' : '#f1f5f9',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                  aria-label="increase mechanics"
                >
                  +
                </button>
                <span style={{ fontSize: 13, opacity: 0.7, marginLeft: 4 }}>
                  ({dollars(plan.seat.amount_cents)}/mo each after the first)
                </span>
              </div>

              <div
                style={{
                  background: isHighlight ? '#1e293b' : '#f8fafc',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 14,
                }}
              >
                Total: <strong style={{ fontSize: 18 }}>{dollars(totalCents)}/mo</strong>
                {mechanics > 1 && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {dollars(plan.base.amount_cents)} base + {mechanics - 1} × {dollars(plan.seat.amount_cents)}
                  </div>
                )}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  $0 today (free for {plan.trial_days} days)
                </div>
              </div>

              <button
                onClick={() => subscribe(plan)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: isHighlight ? '#3b82f6' : '#0f172a',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                {isSubmitting ? 'Loading checkout...' : `Start free trial — ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
