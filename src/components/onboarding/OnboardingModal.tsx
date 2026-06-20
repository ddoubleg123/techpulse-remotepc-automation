'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type FormData = {
  firstName: string;
  lastName: string;
  businessName: string;
  address: string;
  phone: string;
};

function mergeUser(updates: Record<string, any>) {
  useAuthStore.setState((state: any) => ({
    user: state.user ? { ...state.user, ...updates } : state.user,
  }));
}

export default function OnboardingModal() {
  const user = useAuthStore((s: any) => s.user);
  const token = useAuthStore((s: any) => s.token);
  const [step, setStep] = useState(1);
  // Pre-fill from whatever we already have on the account, so users with
  // partial data only fill the gaps. Everything but email is editable.
  const initialName: string = user?.name || user?.full_name || '';
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.first_name || initialName.split(' ')[0] || '',
    lastName: user?.last_name || initialName.split(' ').slice(1).join(' ') || '',
    businessName: user?.business_name || user?.shop_name || '',
    address: user?.address || user?.business_address || '',
    phone: user?.phone || '',
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

  // PATCH the caller's own users row via PostgREST (RLS: auth.uid() = id).
  async function patchSelf(fields: Record<string, unknown>) {
    if (!SUPABASE_ANON_KEY || !token || !user?.id) throw new Error('Not signed in.');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(fields),
      }
    );
    if (res.status === 401) {
      useAuthStore.getState().signOut();
      window.location.href = '/auth/login';
      throw new Error('Session expired — redirecting to sign in.');
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(t || `Request failed (${res.status})`);
    }
  }

  // Upload the profile photo to the public `profile-photos` Storage bucket and
  // return its public URL.
  async function uploadPhoto(file: File): Promise<string> {
    if (!SUPABASE_ANON_KEY || !token || !user?.id) throw new Error('Not signed in.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/profile-photos/${encodeURIComponent(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      }
    );
    if (res.status === 401) {
      useAuthStore.getState().signOut();
      window.location.href = '/auth/login';
      throw new Error('Session expired — redirecting to sign in.');
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(t || `Photo upload failed (${res.status})`);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`;
  }

  const submitStep1 = async () => {
    setError(null);
    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      await patchSelf({
        first_name: formData.firstName,
        last_name: formData.lastName,
        name: fullName,
        full_name: fullName,
      });
      mergeUser({ firstName: formData.firstName, lastName: formData.lastName, name: fullName });
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
      const photoUrl = await uploadPhoto(photoFile);
      await patchSelf({ photo_url: photoUrl });
      mergeUser({ photoUrl });
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

  // Create or join a shop and link this user's shop_id via a SECURITY DEFINER RPC.
  // Returns the shop_id, or null on failure. Requires a Supabase JWT (auth.uid()).
  const assignShop = async (): Promise<string | null> => {
    if (!SUPABASE_ANON_KEY || !token) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/onboarding_assign_shop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_shop_name: formData.businessName,
          p_address: formData.address || null,
          p_phone: formData.phone || null,
        }),
      });
      if (!res.ok) return null;
      const shopId = await res.json(); // RPC returns the uuid (or null)
      return (typeof shopId === 'string' && shopId) ? shopId : null;
    } catch {
      return null;
    }
  };

  const submitStep3 = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1) Save business profile fields directly to the user's row.
      await patchSelf({
        business_name: formData.businessName,
        address: formData.address,
        business_address: formData.address,
        phone: formData.phone,
      });

      // 2) Create/join the shop and link users.shop_id via the SECURITY DEFINER
      //    RPC. REQUIRED: without a shop_id, history + shop-scoped reports return
      //    nothing and the user is bounced back into onboarding. Only mark
      //    onboarding complete once the shop is actually assigned.
      const shopId = await assignShop();
      if (!shopId) {
        setError('We could not link your shop. Please check the business name and try again.');
        return; // do NOT mark onboarding complete — user stays in onboarding
      }

      // 3) Mark onboarding complete now that the shop is linked.
      await patchSelf({ shop_id: shopId, onboarding_completed: true });

      mergeUser({
        shop_id: shopId,
        onboarding_completed: true,
        businessName: formData.businessName,
        address: formData.address,
        businessAddress: formData.address,
        phone: formData.phone,
      });
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Your account email can&apos;t be changed here.</p>
              </div>
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
