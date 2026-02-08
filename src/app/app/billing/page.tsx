'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Button, Badge } from '@/components/ui';
import {
  CreditCard,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Plus,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const invoices = [
  { id: 'INV-001', date: new Date(2024, 0, 15), amount: 350, status: 'paid' },
  { id: 'INV-002', date: new Date(2024, 1, 15), amount: 350, status: 'paid' },
  { id: 'INV-003', date: new Date(2024, 2, 15), amount: 350, status: 'pending' },
];

// Calculate trial dates at module load time
const MODULE_LOAD_TIME = Date.now();
const TRIAL_END_DATE = new Date(MODULE_LOAD_TIME + 7 * 24 * 60 * 60 * 1000);

const subscription = {
  status: 'trial',
  plan: 'TechPulse Pro',
  price: 350,
  trialEndsAt: TRIAL_END_DATE,
  nextBillingDate: TRIAL_END_DATE,
};

export default function BillingPage() {
  const [showAddCard, setShowAddCard] = useState(false);

  const paymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
  };

  return (
    <AppLayout title="Billing" subtitle="Manage your subscription and payments">
      <div className="max-w-4xl space-y-6">
        {/* Trial Banner */}
        {subscription.status === 'trial' && (
          <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h3 className="text-lg font-bold">Free Trial - 7 days remaining</h3>
                    <p className="text-orange-100">
                      Add a payment method to continue using TechPulse after your trial ends.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
            <Badge variant={subscription.status === 'trial' ? 'warning' : 'success'}>
              {subscription.status === 'trial' ? 'Free Trial' : 'Active'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{subscription.plan}</h4>
                <p className="text-gray-500">Full access to all TechPulse features</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">${subscription.price}</p>
                <p className="text-gray-500">/month</p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Unlimited Synth AI chat sessions
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Priority ticket support
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Unlimited PDF report storage
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Community access
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Mobile app access (iOS & Android)
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">
                  {subscription.status === 'trial' ? 'Trial ends' : 'Next billing date'}
                </p>
                <p className="font-medium text-gray-900">
                  {formatDate(subscription.nextBillingDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddCard(!showAddCard)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </CardHeader>
          <CardContent>
            {paymentMethod ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {paymentMethod.brand} •••• {paymentMethod.last4}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Default</Badge>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment method on file</p>
                <Button className="mt-4">Add Payment Method</Button>
              </div>
            )}

            {showAddCard && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Add a new card</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVC
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setShowAddCard(false)}>Save Card</Button>
                    <Button variant="outline" onClick={() => setShowAddCard(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Payments are securely processed by Stripe. We accept ACH and all major cards.
            </p>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invoice.id}</p>
                      <p className="text-sm text-gray-500">{formatDate(invoice.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                      {invoice.status}
                    </Badge>
                    <span className="font-medium text-gray-900">${invoice.amount}</span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Subscription */}
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Cancel Subscription</h4>
                <p className="text-sm text-gray-500">
                  Your subscription will remain active until the end of the billing period.
                </p>
              </div>
              <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                Cancel Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
