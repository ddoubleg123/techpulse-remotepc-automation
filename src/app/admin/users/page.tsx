'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Row {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  membership_active: boolean | null;
  shop_id: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
  last_sign_in_at?: string | null;
  provider?: string | null;
  logged_in_today?: boolean;
}

const roleCls: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  shop_owner: 'bg-blue-100 text-blue-700',
  technician: 'bg-gray-100 text-gray-700',
  developer: 'bg-teal-100 text-teal-700',
  customer: 'bg-amber-100 text-amber-700',
};

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const [res, loginRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/users?select=id,email,name,role,membership_active,shop_id,onboarding_completed,created_at&order=created_at.desc`,
          { headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY } }
        ),
        fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_login_activity`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: '{}',
        }),
      ]);
      if (!res.ok) { setErr('Could not load users.'); setRows([]); }
      else {
        const userRows: Row[] = await res.json();
        // Merge login activity (from auth.users) by id.
        let logins: Record<string, { last_sign_in_at: string | null; provider: string | null; logged_in_today: boolean }> = {};
        if (loginRes.ok) {
          const la = await loginRes.json();
          if (Array.isArray(la)) {
            logins = Object.fromEntries(la.map((r: { id: string; last_sign_in_at: string | null; provider: string | null; logged_in_today: boolean }) =>
              [r.id, { last_sign_in_at: r.last_sign_in_at, provider: r.provider, logged_in_today: r.logged_in_today }]));
          }
        }
        setRows(userRows.map((u) => ({ ...u, ...(logins[u.id] || {}) })));
      }
    } catch {
      setErr('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, token]);

  const filtered = rows.filter((r) => {
    const hay = [r.email, r.name, r.role].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  // Stats computed from the loaded rows (no extra queries).
  const now = Date.now();
  const within = (days: number, iso: string | null) =>
    iso ? now - new Date(iso).getTime() <= days * 86400000 : false;
  const stats = {
    total: rows.length,
    onboarded: rows.filter((r) => r.onboarding_completed === true).length,
    notOnboarded: rows.filter((r) => r.onboarding_completed !== true).length,
    shopless: rows.filter((r) => !r.shop_id).length,
    active: rows.filter((r) => r.membership_active === true).length,
    new7: rows.filter((r) => within(7, r.created_at)).length,
    new30: rows.filter((r) => within(30, r.created_at)).length,
  };
  const roleOrder = ['admin', 'shop_owner', 'technician', 'customer', 'developer'];
  const roleCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.role || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const rolesSorted = Object.keys(roleCounts).sort(
    (a, b) => (roleOrder.indexOf(a) + 1 || 99) - (roleOrder.indexOf(b) + 1 || 99)
  );
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Users ({rows.length})</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {!loading && !err && rows.length > 0 && (
          <div className="mb-6 space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total users', value: stats.total, sub: `${stats.active} active` },
                { label: 'Onboarded', value: stats.onboarded, sub: `${pct(stats.onboarded)}% of users` },
                { label: 'Not onboarded', value: stats.notOnboarded, sub: `${stats.shopless} without a shop` },
                { label: 'New (30 days)', value: stats.new30, sub: `${stats.new7} in last 7 days` },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Role distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">By role</p>
                <div className="space-y-2">
                  {rolesSorted.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium w-24 text-center shrink-0 ${roleCls[role] || 'bg-gray-100 text-gray-700'}`}>
                        {role}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pct(roleCounts[role])}%` }} />
                      </div>
                      <span className="text-sm text-gray-600 w-10 text-right shrink-0">{roleCounts[role]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding status */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Onboarding</p>
                <div className="flex h-3 rounded-full overflow-hidden mb-3">
                  <div className="bg-green-500" style={{ width: `${pct(stats.onboarded)}%` }} title={`${stats.onboarded} onboarded`} />
                  <div className="bg-amber-400" style={{ width: `${pct(stats.notOnboarded)}%` }} title={`${stats.notOnboarded} not onboarded`} />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Onboarded {stats.onboarded}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending {stats.notOnboarded}</span>
                </div>
                <p className="text-xs text-gray-400 mt-3">{stats.shopless} user{stats.shopless === 1 ? '' : 's'} not yet assigned to a shop.</p>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email, name, role…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading users…</div>
          ) : err ? (
            <div className="p-8 text-center text-red-600 text-sm">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No users match.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.name || (r.email ? r.email.split('@')[0] : 'User')}</p>
                    <p className="text-sm text-gray-500 truncate">{r.email || '—'}</p>
                  </div>
                  {r.membership_active === false && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">inactive</span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${roleCls[r.role || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {r.role || 'user'}
                  </span>
                  {/* Last login (from auth.users) */}
                  <div className="w-28 text-right shrink-0">
                    {r.last_sign_in_at ? (
                      <>
                        <div className="flex items-center justify-end gap-1">
                          {r.logged_in_today && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Today</span>}
                          <span className="text-xs text-gray-600">{formatRelativeTime(new Date(r.last_sign_in_at))}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {r.provider === 'google' ? 'Google' : r.provider === 'email' ? 'Email OTP' : (r.provider || '')}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-300">never</span>
                    )}
                  </div>
                  {r.created_at && (
                    <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                      joined {formatRelativeTime(new Date(r.created_at))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
