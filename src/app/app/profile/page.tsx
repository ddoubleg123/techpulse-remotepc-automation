'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';

const CONNECTOR = 'https://techpulse-app.onrender.com';

export default function ProfilePage() {
  const { user, token } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${CONNECTOR}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.status === 401) throw new Error('Authentication failed.');
      if (res.status === 403) throw new Error('Access denied.');
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl space-y-6">

        <Link href="/app/settings" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Profile</h1>

        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white text-3xl font-bold">
                {name?.slice(0, 2).toUpperCase() || 'ME'}
              </span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border-2 border-[var(--border)] rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm">
              <Camera className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Tap to change photo</p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
          <div className="px-5 py-4 space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-transparent text-[var(--text-primary)] text-sm outline-none py-1 placeholder:text-[var(--text-secondary)]"
              placeholder="Your name"
            />
          </div>
          <div className="px-5 py-4 space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Email</label>
            <p className="text-sm text-[var(--text-secondary)] py-1">{user?.email || '-'}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>

      </div>
    </AppLayout>
  );
}
