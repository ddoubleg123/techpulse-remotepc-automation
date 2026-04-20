'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const CONNECTOR = 'https://techpulse-app.onrender.com';

const PLANS = [
  {
    id: 'automated',
    name: 'Automated',
    subtitle: 'Synth only  no human support',
    price: 199,
    priceId: 'price_automated',
    badge: null,
    features: [
      'Unlimited scans with Synth (AI diagnostics)',
      'TechPulse Connector  automatic scan data',
      'Works with traditional diagnostic systems',
      'PDF diagnosis for tech and customer',
      'AI only  no human support',
    ],
  },
  {
    id: 'automated-human',
    name: 'Automated + Human Support',
    subtitle: 'Synth plus expert human backup',
    price: 350,
    priceId: 'price_automated_human',
    badge: 'Most Popular',
    features: [
      'Everything in Automated',
      'Human expert support when you need it',
      'Guidance on tough cases and edge scenarios',
      'Best for shops that want a safety net',
      '$25 per additional user (e.g. 5 users = $450)',
    ],
  },
];

interface BillingStatus {
  planName: string;
  priceDisplay: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd?: boolean;
}

function BillingPageInner() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('price_automated_human');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const [statusRes, plansRes] = await Promise.all([
        fetch(`${CONNECTOR}/api/billing/status`, { headers }),
        fetch(`${CONNECTOR}/api/billing/plans`, { headers }),
      ]);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const plans = Array.isArray(plansData) ? plansData : plansData.plans ?? [];
        // API plans override  when Stripe is configured, use those priceIds
      }
    } catch {
      // Non-fatal  use defaults
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const handleSubscribe = async () => {
    if (!token) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CONNECTOR}/api/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId: selectedPlanId }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const data = await res.json();
      const url = data.url ?? data.checkoutUrl ?? data.sessionUrl;
      if (url) window.location.href = url;
      else throw new Error('No checkout URL returned');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isActive = status?.status === 'active';
  const isTrialing = status?.status === 'trialing';
  const isPastDue = status?.status === 'past_due';
  const hasSubscription = isActive || isTrialing || isPastDue;

  const navy = '#1B3A6B';
  const teal = '#2E75B6';

  return (
    <>
      <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>

        {successParam === 'true' && (
          <div style={{ background:'#E8F5E9', border:'1px solid #27AE60', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>&#x2705;</span>
            <p style={{ margin:0, color:'#1A5C38', fontWeight:600 }}>Subscription activated - welcome to TechPulse Pro!</p>
          </div>
        )}

        {canceledParam === 'true' && (
          <div style={{ background:'#F5F5F5', border:'1px solid #CCC', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
            <p style={{ margin:0, color:'#555' }}>Checkout canceled. No changes were made.</p>
          </div>
        )}

        {isPastDue && (
          <div style={{ background:'linear-gradient(135deg, #E74C3C, #E67E22)', borderRadius:12, padding:'20px 24px', marginBottom:20, color:'white' }}>
            <p style={{ margin:0, fontWeight:700, fontSize:16 }}>Payment past due</p>
            <p style={{ margin:'4px 0 0', opacity:0.9, fontSize:14 }}>Update your payment method to keep access.</p>
          </div>
        )}

        {error && (
          <div style={{ background:'#FDECEA', border:'1px solid #C0392B', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ margin:0, color:'#C0392B', fontSize:14 }}>{error}</p>
            <button onClick={fetchBilling} style={{ background:'none', border:'1px solid #C0392B', color:'#C0392B', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:13 }}>Retry</button>
          </div>
        )}

        {/* Current plan card */}
        <div style={{ background:'white', border:'1px solid #E0E0E0', borderRadius:16, padding:'24px', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:navy }}>Current Plan</h3>
            {!loading && (
              <span style={{
                padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700,
                background: isActive ? '#E8F5E9' : isTrialing ? '#FFF8E1' : isPastDue ? '#FDECEA' : '#F5F5F5',
                color: isActive ? '#1A5C38' : isTrialing ? '#856404' : isPastDue ? '#C0392B' : '#555',
              }}>
                {isActive ? 'Active' : isTrialing ? 'Free Trial' : isPastDue ? 'Past Due' : status?.status === 'canceled' ? 'Canceled' : 'No Subscription'}
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ padding:'24px 0', textAlign:'center', color:'#999' }}>Loading...</div>
          ) : hasSubscription && status ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:16, borderBottom:'1px solid #F0F0F0', marginBottom:16 }}>
                <div>
                  <p style={{ margin:0, fontSize:18, fontWeight:700, color:navy }}>{status.planName || 'TechPulse Pro'}</p>
                  <p style={{ margin:'2px 0 0', color:'#888', fontSize:13 }}>Full platform access</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ margin:0, fontSize:28, fontWeight:800, color:navy }}>{status.priceDisplay || '$375'}</p>
                  <p style={{ margin:0, color:'#888', fontSize:13 }}>/month</p>
                </div>
              </div>
              {status.currentPeriodEnd && (
                <p style={{ margin:0, fontSize:13, color:'#888' }}>
                  {isTrialing ? 'Trial ends' : 'Next billing date'}: <strong style={{ color:navy }}>{new Date(status.currentPeriodEnd).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</strong>
                </p>
              )}
            </>
          ) : (
            <div style={{ padding:'16px 0', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>&#x1F4B3;</div>
              <p style={{ margin:0, color:'#888', fontSize:14 }}>No active subscription</p>
            </div>
          )}
        </div>

        {/* Plans  show when not subscribed */}
        {!loading && !hasSubscription && (
          <>
            <p style={{ margin:'0 0 12px', fontSize:13, color:'#888', textAlign:'center' }}>First month free on both plans. Cancel anytime.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:4 }}>
              {PLANS.map(plan => {
                const isSelected = selectedPlanId === plan.priceId;
                return (
                  <div key={plan.id} onClick={() => setSelectedPlanId(plan.priceId)}
                    style={{ border: isSelected ? `2px solid ${teal}` : '2px solid #E0E0E0', borderRadius:16, overflow:'hidden', cursor:'pointer', position:'relative' }}
                  >
                    {plan.badge && (<div style={{ position:'absolute', top:12, right:12, background:teal, color:'white', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{plan.badge}</div>)}
                    <div style={{ background: isSelected ? `linear-gradient(135deg, ${navy}, ${teal})` : '#F8F9FA', padding:'20px', color: isSelected ? 'white' : navy }}>
                      <p style={{ margin:0, fontSize:11, fontWeight:600, letterSpacing:'0.08em', opacity: isSelected ? 0.8 : 0.6, textTransform:'uppercase' }}>{plan.name}</p>
                      <p style={{ margin:'4px 0 0', fontSize:28, fontWeight:800 }}>${plan.price}<span style={{ fontSize:14, fontWeight:400, opacity:0.8 }}>/mo</span></p>
                      <p style={{ margin:'4px 0 0', fontSize:12, opacity: isSelected ? 0.8 : 0.6 }}>{plan.subtitle}</p>
                    </div>
                    <div style={{ background:'white', padding:'16px 20px' }}>
                      {plan.features.map(f => (
                        <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                          <span style={{ color:'#27AE60', fontSize:14, flexShrink:0, marginTop:1 }}>&#x2713;</span>
                          <span style={{ fontSize:13, color:'#333', lineHeight:'1.4' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleSubscribe} disabled={checkoutLoading}
              style={{ width:'100%', marginBottom:20, marginTop:16, padding:'14px', borderRadius:12, border:'none',
                background: checkoutLoading ? '#AAA' : `linear-gradient(135deg, ${navy}, ${teal})`,
                color:'white', fontWeight:700, fontSize:16, cursor: checkoutLoading ? 'default' : 'pointer' }}
            >
              {checkoutLoading ? 'Redirecting...' : `Subscribe to ${PLANS.find(p=>p.priceId===selectedPlanId)?.name} - $${PLANS.find(p=>p.priceId===selectedPlanId)?.price}/mo`}
            </button>
            <p style={{ textAlign:'center', fontSize:12, color:'#999', marginBottom:20 }}>Secure payment via Stripe. Cancel anytime.</p>
          </>
        )}

        {/* Billing history */}
        <div style={{ background:'white', border:'1px solid #E0E0E0', borderRadius:16, padding:'24px', marginBottom:20 }}>
          <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700, color:navy }}>Billing History</h3>
          <div style={{ textAlign:'center', padding:'24px 0', color:'#BBB' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>&#x1F4C4;</div>
            <p style={{ margin:0, fontSize:13 }}>Payment history will appear here once available.</p>
          </div>
        </div>

        {/* Cancel */}
        {hasSubscription && !status?.cancelAtPeriodEnd && (
          <div style={{ background:'white', border:'1px solid #F5C6CB', borderRadius:16, padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ margin:0, fontWeight:600, color:navy, fontSize:14 }}>Cancel Subscription</p>
              <p style={{ margin:'2px 0 0', fontSize:13, color:'#888' }}>Remains active until end of billing period.</p>
            </div>
            <button style={{ background:'none', border:'1px solid #E74C3C', color:'#E74C3C', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              Cancel Plan
            </button>
          </div>
        )}

      </div>
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}



