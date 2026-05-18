'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

type FormData = {
  firstName: string;
  lastName: string;
  businessName: string;
  address: string;
  phone: string;
};

export default function OnboardingModal() {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    businessName: '',
    address: '',
    phone: '',
  });

  if (!user) return null;

  const update =
    (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [k]: e.target.value }));

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const complete = () => {
    useAuthStore.setState((state: any) => ({
      user: state.user
        ? {
            ...state.user,
            firstName: formData.firstName,
            lastName: formData.lastName,
            businessName: formData.businessName,
            address: formData.address,
            phone: formData.phone,
            onboarding_completed: true,
          }
        : state.user,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Step {step} of 3
        </div>

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-1">About you</h2>
            <p className="text-gray-600 mb-6">Tell us a bit about yourself</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={update('firstName')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={update('lastName')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={goNext}
              disabled={!formData.firstName || !formData.lastName}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Add a profile photo</h2>
            <p className="text-gray-600 mb-6">
              Optional — you can skip and add one later
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center mb-6">
              <p className="text-gray-500 font-medium">Photo upload coming soon</p>
              <p className="text-gray-400 text-sm mt-2">
                You can add a profile photo later in Settings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={goNext}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Your Business</h2>
            <p className="text-gray-600 mb-6">Tell us about your shop</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business name
                </label>
                <input
                  type="text"
                  placeholder="Joe's Auto Shop"
                  value={formData.businessName}
                  onChange={update('businessName')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business address
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street, City, State, ZIP"
                  value={formData.address}
                  onChange={update('address')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={update('phone')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">US phone numbers only</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={goBack}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={complete}
                disabled={!formData.businessName || !formData.address || !formData.phone}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Complete Setup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
