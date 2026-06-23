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

interface GateRow {
  shop_id: string;
  exempt: boolean;
  scan_count: number;
  scan_limit: number;
  blocked: boolean;
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
  const [gate, setGate] = useState<Record<string, GateRow>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const headers = { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
      const [shopsRes, gateRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_shops`, { method: 'POST', headers, body: '{}' }),
        fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_shop_gate_list`, { method: 'POST', headers, body: '{}' }),
      ]);
      if (!shopsRes.ok) { setErr('Could not load shops.'); setRows([]); }
      else { const d = await shopsRes.json(); setRows(Array.isArray(d) ? d : []); }
      if (gateRes.ok) {
        const g = await gateRes.json();
        const map: Record<string, GateRow> = {};
        if (Array.isArray(g)) for (const row of g) map[row.shop_id] = row;
        setGate(map);
      }
    } catch { setErr('Network error.'); setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, token]);

  const toggleExempt = useCallback(async (shopId: string, current: boolean) => {
    const t = useAuthStore.getState().token;
    if (!t || !SUPABASE_ANON_KEY) return;
    const next = !current;
    setGate((prev) => ({
      ...prev,
      [shopId]: {
        ...prev[shopId],
        exempt: next,
        blocked: !next && (prev[shopId]?.scan_count ?? 0) >= (prev[shopId]?.scan_limit ?? 3),
      },
    }));
    setSaving((p) => ({ ...p, [shopId]: true }));
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_set_shop_gate_exempt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_shop_id: shopId, p_exempt: next }),
      });
      if (!res.ok) {
        setGate((prev) => ({ ...prev, [shopId]: { ...prev[shopId], exempt: current } }));
        setErr('Could not update that shop. Try again.');
      }
    } catch {
      setGate((prev) => ({ ...prev, [shopId]: { ...prev[shopId], exempt: current } }));
      setErr('Network error updating shop.');
    } finally {
      setSaving((p) => ({ ...p, [shopId]: false }));
    }
  }, []);

  const [noAccountOnly, setNoAccountOnly] = useState(false);

  const filtered = rows.filter((r) => {
    if (noAccountOnly && (r.member_count ?? 0) > 0) return false;
    return !q.trim() || `${r.shop_name || ''} ${r.city || ''} ${r.state || ''} ${r.owner_name || ''}`.toLowerCase().includes(q.toLowerCase().trim());
  });

  const active = rows.filter((r) => r.is_active).length;
  const paid = rows.filter((r) => ['active', 'past_due'].includes((r.sub_status || '').toLowerCase())).length;
  const noAccount = rows.filter((r) => (r.member_count ?? 0) === 0).length;
  const gated = Object.values(gate).filter((g) => !g.exempt).length;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">All shops · billing status and free-scan trial gate</p>

        <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{rows.length} shops</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">{active} active</span>
          <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-medium">{paid} paid</span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 font-medium" title="Shops currently subject to the 3-free-scan trial gate (not exempt)">{gated} gated</span>
          <button
            onClick={() => setNoAccountOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-lg font-medium border ${noAccountOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
            title="Shops with no logged-in user account — prospects to convert">
            {noAccount} without account{noAccountOnly ? ' (filtering)' : ''}
          </button>
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
            const g = gate[r.id];
            const exempt = g ? g.exempt : true;
            const isSaving = !!saving[r.id];
            const labelCls = exempt ? 'text-green-700' : 'text-purple-700';
            return (
              <div key={r.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.shop_name || 'Unnamed shop'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.owner_name ? r.owner_name : 'no owner name'}{loc ? ` · ${loc}` : ''}
                    {r.created_at ? ` · added ${formatRelativeTime(new Date(r.created_at))}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {g && !exempt && (
                    <span className={`text-xs font-medium w-16 text-center ${g.blocked ? 'text-red-600' : 'text-gray-500'}`}>
                      {g.scan_count}/{g.scan_limit}{g.blocked ? ' · over' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => toggleExempt(r.id, exempt)}
                    disabled={isSaving}
                    title={exempt ? 'Exempt — NOT subject to the 3-free-scan limit. Click to enable the gate.' : 'Gated — must pay after 3 free scans. Click to exempt.'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${exempt ? 'bg-green-500' : 'bg-purple-500'} ${isSaving ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${exempt ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs font-medium w-16 text-center ${labelCls}`}>
                    {exempt ? 'Exempt' : 'Gated'}
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 w-20 text-center ${c.cls}`}>{c.label}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          <strong>Exempt</strong> = unlimited free scans (use for manually-billed or comped shops). <strong>Gated</strong> = blocked after 3 successful scans until they subscribe. Only scans run after the gate launch date count.
        </p>
      </div>
    </div>
  );
}
