'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Row {
  shop_id: string | null;
  shop_name: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  started: number;
  reached_codes: number;
  reached_diagnose: number;
  finished: number;
}

interface Totals {
  started: number;
  reached_codes: number;
  reached_diagnose: number;
  finished: number;
}

const STEPS: { key: keyof Totals; label: string }[] = [
  { key: 'started', label: '1 · Vehicle entered' },
  { key: 'reached_codes', label: '2 · Codes added' },
  { key: 'reached_diagnose', label: '3 · Diagnosed with Synth' },
  { key: 'finished', label: '4 · Report generated' },
];

function sum(rows: Row[]): Totals {
  return rows.reduce(
    (a, r) => ({
      started: a.started + r.started,
      reached_codes: a.reached_codes + r.reached_codes,
      reached_diagnose: a.reached_diagnose + r.reached_diagnose,
      finished: a.finished + r.finished,
    }),
    { started: 0, reached_codes: 0, reached_diagnose: 0, finished: 0 }
  );
}

export default function FunnelPanel({ from, to }: { from: string | null; to: string | null }) {
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  // drill state: null = all customers; shopId set = inside a shop
  const [shopId, setShopId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_funnel_breakdown`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_from: from, p_to: to }),
      });
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
      else setRows([]);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); setShopId(null); }, [load, token]);

  // Overall totals
  const overall = useMemo(() => sum(rows), [rows]);

  // Per-shop rollup
  const shops = useMemo(() => {
    const m = new Map<string, { shop_id: string | null; shop_name: string; rows: Row[] }>();
    for (const r of rows) {
      const k = r.shop_id || '__none__';
      if (!m.has(k)) m.set(k, { shop_id: r.shop_id, shop_name: r.shop_name || '(no shop)', rows: [] });
      m.get(k)!.rows.push(r);
    }
    return [...m.values()].map((s) => ({ ...s, totals: sum(s.rows) })).sort((a, b) => b.totals.started - a.totals.started);
  }, [rows]);

  // Mechanics within the selected shop
  const activeShop = shopId ? shops.find((s) => (s.shop_id || '__none__') === shopId) : null;
  const mechanics = useMemo(() => {
    if (!activeShop) return [];
    return activeShop.rows
      .map((r) => ({
        label: r.user_name || r.user_email || 'Unknown mechanic',
        sub: r.user_email || '',
        totals: { started: r.started, reached_codes: r.reached_codes, reached_diagnose: r.reached_diagnose, finished: r.finished },
      }))
      .sort((a, b) => b.totals.started - a.totals.started);
  }, [activeShop]);

  const scopeTotals = activeShop ? activeShop.totals : overall;
  const completion = scopeTotals.started ? Math.round((scopeTotals.finished / scopeTotals.started) * 100) : 0;
  const abandoned = scopeTotals.started - scopeTotals.finished;

  if (loading && rows.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 text-sm text-gray-500">Loading funnel…</div>;
  }
  if (!loading && overall.started === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 text-sm text-gray-500">
        No diagnostics started in this period yet. Once customers begin a diagnostic, the funnel will populate here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
      {/* Scope header / breadcrumb */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {activeShop && (
            <button onClick={() => setShopId(null)} className="p-1 rounded hover:bg-gray-100" title="Back to all customers">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{activeShop ? activeShop.shop_name : 'All customers'}</p>
            <p className="text-xs text-gray-400">{activeShop ? 'Shop funnel — click a mechanic below' : 'Overall funnel — click a shop below'}</p>
          </div>
        </div>
      </div>

      {/* Summary cards for current scope */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Started" value={scopeTotals.started} />
        <Stat label="Finished" value={scopeTotals.finished} />
        <Stat label="Abandoned" value={abandoned} amber />
        <Stat label="Completion" value={`${completion}%`} />
      </div>

      {/* Step bars for current scope */}
      <div className="space-y-2.5 mb-4">
        {STEPS.map((st, i) => {
          const v = scopeTotals[st.key];
          const pct = scopeTotals.started ? Math.round((v / scopeTotals.started) * 100) : 0;
          const prev = i === 0 ? v : scopeTotals[STEPS[i - 1].key];
          const dropped = prev - v;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={st.key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-gray-800">{st.label}</span>
                <span className="text-xs text-gray-500">
                  {v} reached{i > 0 && dropped > 0 ? <span className="text-amber-600"> · {dropped} left here</span> : null}
                </span>
              </div>
              <div className="h-7 rounded-md bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-md flex items-center pl-2 ${isLast ? 'bg-teal-600' : 'bg-blue-600'}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                >
                  <span className="text-xs text-white font-medium">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill list: shops (overall) or mechanics (in a shop) */}
      {!activeShop ? (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">By shop — click to drill in</p>
          <div className="divide-y divide-gray-100">
            {shops.map((s) => {
              const comp = s.totals.started ? Math.round((s.totals.finished / s.totals.started) * 100) : 0;
              return (
                <button
                  key={s.shop_id || '__none__'}
                  onClick={() => setShopId(s.shop_id || '__none__')}
                  className="w-full flex items-center justify-between py-2.5 hover:bg-gray-50 text-left"
                >
                  <span className="font-medium text-gray-900 truncate">{s.shop_name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {s.totals.started} started · {s.totals.finished} finished · <span className="text-gray-700">{comp}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">By mechanic</p>
          <div className="divide-y divide-gray-100">
            {mechanics.length === 0 && <p className="text-sm text-gray-400 py-2">No mechanic-level data.</p>}
            {mechanics.map((m, i) => {
              const comp = m.totals.started ? Math.round((m.totals.finished / m.totals.started) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{m.label}</p>
                    {m.sub && m.sub !== m.label && <p className="text-xs text-gray-400 truncate">{m.sub}</p>}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {m.totals.started} started · {m.totals.finished} finished · <span className="text-gray-700">{comp}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, amber }: { label: string; value: number | string; amber?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className={`text-2xl font-bold ${amber ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
