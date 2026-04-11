'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Button, Badge } from '@/components/ui';
import { CreditCard, Calendar, CheckCircle, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const CONNECTOR = 'https://techpulse-app.onrender.com';

interface BillingStatus {
  planName: string;
  priceDisplay: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  description?: string;
}

function BillingPageInner() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
      if (!statusRes.ok) throw new Error(`Status fetch failed (${statusRes.status})`);
      if (!plansRes.ok) throw new Error(`Plans fetch failed (${plansRes.status})`);
      const [statusData, plansData] = await Promise.all([statusRes.json(), plansRes.json()]);
      setStatus(statusData);
      setPlans(Array.isArray(plansData) ? plansData : plansData.plans ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const handleSubscribe = async (priceId: string) => {
    if (!token) return;
    setCheckoutLoading(priceId);
    try {
      const res = await fetch(`${CONNECTOR}/api/billing/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const data = await res.json();
      const url = data.url ?? data.checkoutUrl ?? data.sessionUrl;
      if (url) window.location.href = url;
      else throw new Error('No checkout URL returned');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isActive = status?.status === 'active';
  const isTrialing = status?.status === 'trialing';
  const isPastDue = status?.status === 'past_due';
  const hasSubscription = isActive || isTrialing || isPastDue;

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">

        {successParam === 'true' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Subscription activated Ã¢ÂÂ welcome to TechPulse Pro!</p>
            </CardContent>
          </Card>
        )}
        {canceledParam === 'true' && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <p className="text-gray-600">Checkout canceled. No changes were made.</p>
            </CardContent>
          </Card>
        )}

        {isPastDue && (
          <Card className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold">Payment past due</h3>
                <p className="text-red-100">Update your payment method to keep access.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-red-700 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchBilling}>
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
            {!loading && status && (
              <Badge variant={isActive ? 'success' : isTrialing ? 'warning' : isPastDue ? 'error' : 'default'}>
                {isActive ? 'Active' : isTrialing ? 'Free Trial' : isPastDue ? 'Past Due' : status.status === 'canceled' ? 'Canceled' : 'No Subscription'}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-400 animate-pulse">LoadingÃ¢ÂÂ¦</div>
            ) : hasSubscription && status ? (
              <>
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{status.planName || 'TechPulse Pro'}</h4>
                    <p className="text-gray-500">Full access to all TechPulse features</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">{status.priceDisplay || '$375'}</p>
                    <p className="text-gray-500">/month</p>
                  </div>
                </div>
                <div className="py-4 space-y-3">
                  {[
                    'Unlimited Synth AI chat sessions',
                    'Priority ticket support',
                    'Unlimited PDF report storage',
                    'Community access',
                    'Mobile app access (iOS & Android)',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
                {status.currentPeriodEnd && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{isTrialing ? 'Trial ends' : 'Next billing date'}</p>
                      <p className="font-medium text-gray-900">
                        {new Date(status.currentPeriodEnd).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active subscription Ã¢ÂÂ choose a plan below.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && plans.length > 0 && !hasSubscription && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Choose a Plan</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {plans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div>
                    <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                    {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-900">
                      ${plan.price}<span className="text-base font-normal text-gray-500">/mo</span>
                    </span>
                    <Button
                      onClick={() => handleSubscribe(plan.priceId)}
                      disabled={checkoutLoading === plan.priceId}
                    >
                      {checkoutLoading === plan.priceId ? 'RedirectingÃ¢ÂÂ¦' : 'Subscribe'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Payment history will appear here once available.</p>
            </div>
          </CardContent>
        </Card>

        {hasSubscription && !status?.cancelAtPeriodEnd && (
          <Card className="border-red-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Cancel Subscription</h4>
                <p className="text-sm text-gray-500">Remains active until end of the billing period.</p>
              </div>
              <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                Cancel Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {hasSubscription && status?.cancelAtPeriodEnd && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <p className="text-orange-800 font-medium">
                Subscription set to cancel at end of billing period.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </AppLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}
