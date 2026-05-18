'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

const SYNC_API = 'https://techpulse-sync-api.onrender.com';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type FormData = {
  firstName: string;
  lastName: string;
  businessName: string;
  address: string;
  phone: string;
};

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = fr.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    fr.onerror = () => reject(fr.error || new Error('FileReader error'));
    fr.readAsDataURL(file);
  });
}

function mergeUser(updates: Record<string, any>) {
  useAuthStore.setState((state: any) => ({
    user: state.user ? { ...state.user, ...updates } : state.user,
  }));
}

export default function OnboardingModal() {
  const user = useAuthStore((s: any) => s.user);
  const token = useAuthStore((s: any) => s.token);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    businessName: '',
    address: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;
  if (!token) return null;

  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [k]: e.target.value }));

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Image is too large. Max size is 5 MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  async function apiCall(path: string, body: any) {
    const res = await fetch(`${SYNC_API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }

  const submitStep1 = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiCall('/api/profile/update', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      if (data?.user) {
        mergeUser({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
        });
      }
      setStep(2);
    } catch (e: any) {
      setError(e?.message || 'Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async () => {
    setError(null);
    if (!photoFile) {
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      const base64 = await readFileAsBase64(photoFile);
      const data = await apiCall('/api/profile/upload-photo', {
        photoBase64: base64,
        contentType: photoFile.type,
      });
      if (data?.photoUrl) {
        mergeUser({ photoUrl: data.photoUrl });
      }
      setStep(3);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skipPhoto = () => {
    setError(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setStep(3);
  };

  const submitStep3 = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiCall('/api/profile/onboarding', {
        businessName: formData.businessName,
        address: formData.address,
        phone: formData.phone,
      });
      if (data?.user) {
        mergeUser({
          businessName: data.user.businessName,
          address: data.user.address,
          phone: data.user.phone,
          businessAddress: data.user.businessAddress,
          onboarding_completed: true,
        });
      } else {
        mergeUser({ onboarding_completed: true });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
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
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={update('firstName')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={update('lastName')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <button
              onClick={submitStep1}
              disabled={loading || !formData.firstName || !formData.lastName}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Add a profile photo</h2>
            <p className="text-gray-600 mb-6">Optional — you can skip and add one later</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onPhotoChange}
              className="hidden"
            />
            {photoPreview ? (
              <div className="text-center mb-4">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-3 border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  Choose different photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 text-center mb-4 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <p className="text-gray-700 font-medium">Tap to add photo</p>
                <p className="text-gray-400 text-sm mt-2">JPG, PNG, WebP, or GIF (max 5 MB)</p>
              </button>
            )}
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={goBack}
                disabled={loading}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              {photoFile ? (
                <button
                  onClick={submitStep2}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {loading ? 'Uploading…' : 'Upload & Continue'}
                </button>
              ) : (
                <button
                  onClick={skipPhoto}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  Skip for now
                </button>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Your Business</h2>
            <p className="text-gray-600 mb-6">Tell us about your shop</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
                <input
                  type="text"
                  placeholder="Joe's Auto Shop"
                  value={formData.businessName}
                  onChange={update('businessName')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business address</label>
                <input
                  type="text"
                  placeholder="123 Main Street, City, State, ZIP"
                  value={formData.address}
                  onChange={update('address')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={update('phone')}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">US phone numbers only</p>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={goBack}
                disabled={loading}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={submitStep3}
                disabled={loading || !formData.businessName || !formData.address || !formData.phone}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading ? 'Saving…' : 'Complete Setup'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
