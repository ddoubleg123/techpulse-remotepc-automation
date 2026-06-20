'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Search, FileText, MessageSquare, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Diag {
  id: string;
  occurred_on: string | null;
  shop_id: string | null;
  shop_name: string | null;
  technician_name: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  vin: string | null;
  dtc_codes: string[] | null;
  complaint: string | null;
  diagnosis_outcome: string | null;
  has_scan: boolean;
  has_chat: boolean;
  msg_count: number;
  source: string | null;
  created_at: string | null;
}

interface DiagDetail {
  id: string;
  shop_name: string | null;
  technician_name: string | null;
  occurred_on: string | null;
  year: number | null; make: string | null; model: string | null; engine: string | null; vin: string | null;
  dtc_codes: string[] | null;
  complaint: string | null;
  symptoms: string | null;
  diagnostic_findings: string | null;
  diagnosis: string | null;
  repair_recommendation: string | null;
  conclusion: string | null;
  source_file: string | null;
  full_content: string | null;
  diagnosis_pdf_url: string | null;
  messages: { role: string; content: string }[] | null;
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'All time', days: 0 },
];

function vehicleLabel(d: { year: number | null; make: string | null; model: string | null }) {
  return [d.year, d.make, d.model].filter(Boolean).join(' ') || 'Unknown vehicle';
}

function DiagnosticsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const days = parseInt(searchParams.get('days') ?? '90', 10);
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';

  const [rows, setRows] = useState<Diag[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [openShops, setOpenShops] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<DiagDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolve the active window: explicit from/to wins, else days preset.
  const computeRange = useCallback((): { from: string | null; to: string | null } => {
    if (fromParam || toParam) return { from: fromParam || null, to: toParam || null };
    if (!days || days <= 0) return { from: null, to: null }; // all time
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [days, fromParam, toParam]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const { from, to } = computeRange();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_diagnostics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_from: from, p_to: to, p_customers_only: true }),
      });
      if (!res.ok) { setErr('Could not load diagnostics.'); setRows([]); }
      else { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch { setErr('Network error.'); setRows([]); }
    finally { setLoading(false); }
  }, [computeRange]);

  useEffect(() => { load(); }, [load, token]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null);
    try {
      const t = useAuthStore.getState().token;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_diagnostic_detail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id }),
      });
      const d = await res.json();
      setDetail(Array.isArray(d) && d[0] ? d[0] : null);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const setDays = (d: number) => router.push(`/admin/diagnostics?days=${d}`);
  const applyCustom = (from: string, to: string) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    router.push(`/admin/diagnostics?${p.toString()}`);
  };

  // Filter + group by shop, then vehicle.
  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.shop_name || ''} ${vehicleLabel(r)} ${r.vin || ''} ${(r.dtc_codes || []).join(' ')} ${r.complaint || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase().trim());
  });

  const byShop = filtered.reduce<Record<string, Diag[]>>((acc, r) => {
    const k = r.shop_name || 'Unassigned';
    (acc[k] ||= []).push(r);
    return acc;
  }, {});
  const shopNames = Object.keys(byShop).sort();

  const totalScans = rows.filter((r) => r.has_scan).length;
  const totalChats = rows.filter((r) => r.has_chat).length;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Customer Diagnostics</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Diagnostics run for customer shops · grouped by shop and vehicle</p>

        {/* Range selector */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {RANGES.map((r) => {
            const active = !fromParam && !toParam && days === r.days;
            return (
              <button key={r.label} onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap text-sm">
          <span className="text-gray-500">Custom:</span>
          <input type="date" defaultValue={fromParam} id="diag-from" className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" defaultValue={toParam} id="diag-to" className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
          <button
            onClick={() => {
              const f = (document.getElementById('diag-from') as HTMLInputElement)?.value || '';
              const t = (document.getElementById('diag-to') as HTMLInputElement)?.value || '';
              if (f || t) applyCustom(f, t);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800">
            Apply
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{rows.length} diagnostics</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">{shopNames.length} shops</span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 font-medium">{totalScans} with scan</span>
          <span className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 font-medium">{totalChats} with chat</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by shop, vehicle, VIN, DTC, complaint..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
        </div>

        {err && <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

        {loading && rows.length === 0 && <div className="p-6 text-sm text-gray-500">Loading…</div>}
        {!loading && shopNames.length === 0 && <div className="p-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">No customer diagnostics in this period.</div>}

        {/* Grouped by shop */}
        <div className="space-y-3">
          {shopNames.map((shop) => {
            const items = byShop[shop];
            const isOpen = openShops[shop] ?? true;
            return (
              <div key={shop} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenShops((s) => ({ ...s, [shop]: !isOpen }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold text-gray-900">{shop}</span>
                  </div>
                  <span className="text-xs text-gray-500">{items.length} diagnostic{items.length === 1 ? '' : 's'}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {items.map((r) => (
                      <button key={r.id} onClick={() => openDetail(r.id)}
                        className="w-full p-4 pl-10 flex items-center gap-3 hover:bg-blue-50/40 text-left">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{vehicleLabel(r)}{r.engine ? ` · ${r.engine}` : ''}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {(r.dtc_codes && r.dtc_codes.length) ? r.dtc_codes.join(', ') + ' · ' : ''}
                            {r.complaint || 'No complaint recorded'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {r.occurred_on || ''}{r.technician_name ? ` · ${r.technician_name}` : ''}{r.source ? ` · ${r.source}` : ''}
                          </p>
                        </div>
                        {r.has_scan && <span className="flex items-center gap-1 text-[11px] text-purple-600 shrink-0"><FileText className="w-3.5 h-3.5" />scan</span>}
                        {r.has_chat && <span className="flex items-center gap-1 text-[11px] text-teal-600 shrink-0"><MessageSquare className="w-3.5 h-3.5" />{r.msg_count}</span>}
                        {r.diagnosis_outcome && <span className="text-[11px] text-gray-500 shrink-0 w-20 text-right truncate">{r.diagnosis_outcome}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => { setDetail(null); }}>
          <div className="w-full max-w-2xl h-full bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Diagnostic detail</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {detailLoading && <div className="p-6 text-sm text-gray-500">Loading…</div>}
            {detail && (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{vehicleLabel(detail)}{detail.engine ? ` · ${detail.engine}` : ''}</p>
                  <p className="text-sm text-gray-500">
                    {detail.shop_name || 'Unassigned'}{detail.technician_name ? ` · ${detail.technician_name}` : ''}{detail.occurred_on ? ` · ${detail.occurred_on}` : ''}
                  </p>
                  {detail.vin && <p className="text-xs text-gray-400 mt-0.5">VIN: {detail.vin}</p>}
                  {detail.dtc_codes && detail.dtc_codes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {detail.dtc_codes.map((c, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">{c}</span>)}
                    </div>
                  )}
                </div>

                {detail.complaint && <Section title="Complaint" body={detail.complaint} />}
                {detail.symptoms && <Section title="Symptoms" body={detail.symptoms} />}

                {/* Scan / uploaded content */}
                {(detail.source_file || detail.full_content) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1"><FileText className="w-4 h-4 text-purple-600" />Scan / uploaded data</h3>
                    {detail.source_file && <p className="text-xs text-gray-400 mb-1">Source: {detail.source_file}</p>}
                    {detail.full_content && (
                      <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap max-h-72 overflow-y-auto text-gray-700">{detail.full_content}</pre>
                    )}
                  </div>
                )}

                {detail.diagnostic_findings && <Section title="Findings" body={detail.diagnostic_findings} />}
                {detail.diagnosis && <Section title="Diagnosis" body={detail.diagnosis} />}
                {detail.repair_recommendation && <Section title="Repair recommendation" body={detail.repair_recommendation} />}
                {detail.conclusion && <Section title="Conclusion" body={detail.conclusion} />}

                {/* Chat history */}
                {detail.messages && Array.isArray(detail.messages) && detail.messages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4 text-teal-600" />Chat history</h3>
                    <div className="space-y-2">
                      {detail.messages.map((m, i) => (
                        <div key={i} className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-700'}`}>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{m.role === 'user' ? 'Technician' : 'Synth'}</p>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.diagnosis_pdf_url && (
                  <a href={detail.diagnosis_pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <FileText className="w-4 h-4" />View diagnosis PDF
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <DiagnosticsInner />
    </Suspense>
  );
}
