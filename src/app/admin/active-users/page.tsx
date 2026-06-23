'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';
import UserDetailModal from '@/components/admin/UserDetailModal';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface ActiveUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  last_active: string | null;
  last_sign_in_at: string | null;
  provider: string | null;
  shop_id: string | null;
  shop_name: string | null;
  sub_status: string | null;
  plan_type: string | null;
  is_paid: boolean | null;
  membership_active: boolean | null;
  signed_up_at: string | null;
}

const roleCls: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  shop_owner: 'bg-blue-100 text-blue-700',
  technician: 'bg-gray-100 text-gray-700',
  customer: 'bg-amber-100 text-amber-700',
  developer: 'bg-teal-100 text-teal-700',
};

// Human label + colour for billing status.
function billing(u: ActiveUser): { label: string; cls: string } {
  if (u.is_paid) return { label: 'Paid', cls: 'bg-green-100 text-green-700' };
  const s = (u.sub_status || '').toLowerCase();
  if (s === 'trialing') return { label: 'Trial', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'canceled' || s === 'cancelled') return { label: 'Canceled', cls: 'bg-red-100 text-red-700' };
  if (s === 'past_due') return { label: 'Past due', cls: 'bg-orange-100 text-orange-700' };
  if (s) return { label: s, cls: 'bg-gray-100 text-gray-700' };
  return { label: 'No plan', cls: 'bg-gray-100 text-gray-500' };
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function ActiveUsersInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const days = Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1);
  const [rows, setRows] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_active_users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) { setErr('Could not load active users.'); setRows([]); }
      else {
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } catch { setErr('Network error.'); setRows([]); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load, token]);

  const setDays = (d: number) => router.push(`/admin/active-users?days=${d}`);

  const filtered = rows.filter((u) => {
    if (!q.trim()) return true;
    const hay = `${u.email || ''} ${u.name || ''} ${u.role || ''} ${u.shop_name || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase().trim());
  });

  const paidCount = rows.filter((u) => u.is_paid).length;
  const trialCount = rows.filter((u) => (u.sub_status || '').toLowerCase() === 'trialing').length;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Active Users</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Signed in within the last {days} days · sorted by most recently active
        </p>

        {/* Range selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                days === r.days ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
          <span className="text-gray-300">|</span>
          <label className="text-sm text-gray-500">Custom:</label>
          <input
            type="number"
            min={1}
            defaultValue={days}
            onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value, 10); if (v > 0) setDays(v); } }}
            className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
            title="Press Enter to apply"
          />
          <span className="text-sm text-gray-400">days</span>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{rows.length} active</span>
          <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium">{paidCount} paid</span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-medium">{trialCount} on trial</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email, name, role, shop..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm"
          />
        </div>

        {err && <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {loading && rows.length === 0 && (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-sm text-gray-500">No active users in this period.</div>
          )}
          {filtered.map((u) => {
            const b = billing(u);
            return (
              <div key={u.id} onClick={() => setSelectedUserId(u.id)} className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{u.name || (u.email ? u.email.split('@')[0] : 'User')}</p>
                  <p className="text-sm text-gray-500 truncate">{u.email || '—'}</p>
                  {u.shop_name && <p className="text-xs text-gray-400 truncate">{u.shop_name}</p>}
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${roleCls[u.role || ''] || 'bg-gray-100 text-gray-700'}`}>
                  {u.role || 'user'}
                </span>

                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 w-20 text-center ${b.cls}`} title={u.sub_status || 'no subscription'}>
                  {b.label}
                </span>

                <div className="w-36 text-right shrink-0">
                  {u.last_active ? (
                    <>
                      <p className="text-sm text-gray-700">active {formatRelativeTime(new Date(u.last_active))}</p>
                      <p className="text-[10px] text-gray-400">
                        {u.provider === 'google' ? 'Google' : u.provider === 'email' ? 'Email OTP' : (u.provider || '')}
                        {u.last_sign_in_at ? ` · login ${formatRelativeTime(new Date(u.last_sign_in_at))}` : ''}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </div>
  );
}

export default function ActiveUsersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <ActiveUsersInner />
    </Suspense>
  );
}
