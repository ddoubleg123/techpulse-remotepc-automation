'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Shop {
  id: string;
  shop_name: string | null;
  city: string | null;
  state: string | null;
  owner_name: string | null;
  is_active: boolean | null;
  plan_type: string | null;
  sub_status: string | null;
  member_count: number | null;
  onboarded_at: string | null;
  created_at: string | null;
}

function subChip(s: string | null): { label: string; cls: string } {
  const v = (s || '').toLowerCase();
  if (v === 'active') return { label: 'Paid', cls: 'bg-green-100 text-green-700' };
  if (v === 'trialing') return { label: 'Trial', cls: 'bg-amber-100 text-amber-700' };
  if (v === 'past_due') return { label: 'Past due', cls: 'bg-orange-100 text-orange-700' };
  if (v === 'canceled' || v === 'cancelled') return { label: 'Canceled', cls: 'bg-red-100 text-red-700' };
  if (v) return { label: v, cls: 'bg-gray-100 text-gray-700' };
  return { label: 'No sub', cls: 'bg-gray-100 text-gray-500' };
}

export default function ShopsPage() {
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_shops`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) { setErr('Could not load shops.'); setRows([]); }
      else { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch { setErr('Network error.'); setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, token]);

  const filtered = rows.filter((r) =>
    !q.trim() || `${r.shop_name || ''} ${r.city || ''} ${r.state || ''} ${r.owner_name || ''}`.toLowerCase().includes(q.toLowerCase().trim())
  );

  const active = rows.filter((r) => r.is_active).length;
  const paid = rows.filter((r) => ['active', 'past_due'].includes((r.sub_status || '').toLowerCase())).length;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">All shops · with member count and billing status</p>

        <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{rows.length} shops</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">{active} active</span>
          <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium">{paid} paid</span>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by shop, city, owner..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
        </div>

        {err && <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {loading && rows.length === 0 && <div className="p-6 text-sm text-gray-500">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="p-6 text-sm text-gray-500">No shops.</div>}
          {filtered.map((r) => {
            const c = subChip(r.sub_status);
            const loc = [r.city, r.state].filter(Boolean).join(', ');
            return (
              <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.shop_name || 'Unnamed shop'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.owner_name ? r.owner_name : 'no owner name'}{loc ? ` · ${loc}` : ''}
                    {r.created_at ? ` · added ${formatRelativeTime(new Date(r.created_at))}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0 w-20 text-center">
                  {(r.member_count ?? 0)} member{r.member_count === 1 ? '' : 's'}
                </span>
                {!r.is_active && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 shrink-0">Inactive</span>}
                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 w-20 text-center ${c.cls}`}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
