'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Search, FileText, MessageSquare, X, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import FunnelPanel from '@/components/admin/FunnelPanel';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Activity {
  id: string;
  occurred_on: string | null;
  customer_id: string | null;
  user_email: string | null;
  shop_id: string | null;
  shop_name: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_engine: string | null;
  vin: string | null;
  mileage: number | null;
  dtc_codes: string[] | null;
  complaint: string | null;
  status: string | null;
  has_chat: boolean;
  msg_count: number | null;
  created_at: string | null;
}

interface ChatMsg { id?: string; ts?: number; role?: string; content?: string }

interface CaseDetail {
  id: string;
  occurred_on: string | null;
  user_email: string | null;
  shop_name: string | null;
  vehicle_year: number | null; vehicle_make: string | null; vehicle_model: string | null;
  vehicle_engine: string | null; vin: string | null; mileage: number | null;
  dtc_codes: string[] | null;
  complaint: string | null;
  initial_diagnosis: string | null;
  final_diagnosis: string | null;
  repair_performed: string | null;
  parts_replaced: string | null;
  status: string | null;
  diagnostic_data: unknown;
  conversation_log: string | null;
  messages: ChatMsg[] | null;
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'All time', days: 0 },
];

function vehicleLabel(d: { vehicle_year: number | null; vehicle_make: string | null; vehicle_model: string | null }) {
  return [d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || 'Unknown vehicle';
}

function userLabel(a: Activity): string {
  return a.user_email || 'Unattributed';
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function exactTime(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Minimal, safe inline formatter for Synth markdown content (no external dep).
// Handles **bold**, `code`, ``` blocks, ### headers, --- rules; preserves line breaks. Escapes HTML first.
function formatContent(raw: string): { __html: string } {
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  s = s.replace(/```([\s\S]*?)```/g, (_m, code) =>
    `<pre class="bg-black/5 rounded-md p-2 my-1 overflow-x-auto text-[12px]"><code>${code.trim()}</code></pre>`);
  s = s.replace(/^#{1,6}\s?(.*)$/gm, '<div class="font-semibold mt-2">$1</div>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code class="bg-black/5 rounded px-1 py-0.5 text-[12px]">$1</code>');
  s = s.replace(/^---+$/gm, '<hr class="my-2 border-black/10" />');
  s = s.replace(/\n/g, '<br/>');
  return { __html: s };
}

function DiagnosticsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const days = parseInt(searchParams.get('days') ?? '90', 10);
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';

  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'chat' | 'scan'>('chat');

  const computeRange = useCallback((): { from: string | null; to: string | null } => {
    if (fromParam || toParam) return { from: fromParam || null, to: toParam || null };
    if (!days || days <= 0) return { from: null, to: null };
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_customer_activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_from: from, p_to: to }),
      });
      if (!res.ok) { setErr('Could not load customer activity.'); setRows([]); }
      else { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch { setErr('Network error.'); setRows([]); }
    finally { setLoading(false); }
  }, [computeRange]);

  useEffect(() => { load(); }, [load, token]);

  const openChat = async (id: string, tab: 'chat' | 'scan' = 'chat') => {
    setDetailTab(tab);
    setDetailLoading(true); setDetail(null);
    try {
      const t = useAuthStore.getState().token;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_customer_case_detail`, {
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

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = `${userLabel(r)} ${r.shop_name || ''} ${vehicleLabel(r)} ${r.vin || ''} ${(r.dtc_codes || []).join(' ')} ${r.complaint || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase().trim());
  });

  const withChat = rows.filter((r) => r.has_chat).length;
  const uniqueUsers = new Set(rows.map((r) => r.user_email || r.customer_id || r.id)).size;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic Scans</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Most recent customer scans — who ran them, when, and their shop. Open any row with a chat to view the full Synth conversation (read-only).</p>

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

        {/* Funnel: drill-down (all customers -> shop -> mechanic) */}
        <FunnelPanel from={computeRange().from} to={computeRange().to} />

        <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium">{rows.length} scans</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">{uniqueUsers} users</span>
          <span className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 font-medium">{withChat} with chat</span>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by user, shop, vehicle, VIN, DTC, complaint..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
        </div>

        {err && <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

        {loading && rows.length === 0 && <div className="p-6 text-sm text-gray-500">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">No diagnostic scans in this period.</div>}

        {filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_120px_1fr_140px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <div>User</div>
              <div>When</div>
              <div>Shop · Vehicle</div>
              <div className="text-right">Chat</div>
            </div>
            <div className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_140px] gap-1 sm:gap-3 px-4 py-3 items-center hover:bg-gray-50/60">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{userLabel(r)}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {(r.dtc_codes && r.dtc_codes.length) ? r.dtc_codes.join(', ') + ' · ' : ''}
                      {r.complaint || 'No complaint recorded'}
                    </p>
                  </div>
                  <div className="min-w-0" title={exactTime(r.created_at)}>
                    <p className="text-sm text-gray-700">{relativeTime(r.created_at)}</p>
                    <p className="text-[10px] text-gray-400 hidden sm:block">{exactTime(r.created_at)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{r.shop_name || 'No shop'}</p>
                    <p className="text-xs text-gray-500 truncate">{vehicleLabel(r)}{r.vehicle_engine ? ` · ${r.vehicle_engine}` : ''}</p>
                  </div>
                  <div className="sm:text-right mt-1 sm:mt-0">
                    {r.has_chat ? (
                      <button
                        onClick={() => openChat(r.id, 'chat')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700">
                        <MessageSquare className="w-4 h-4" />
                        View Chat
                        {r.msg_count ? <span className="text-[11px] opacity-80">({r.msg_count})</span> : null}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        title="No chat was recorded for this scan"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                        <MessageSquare className="w-4 h-4" />
                        No chat recorded
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => { setDetail(null); }}>
          <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {detail ? `${detail.user_email || 'Unattributed'}` : 'Loading…'}
                  </h2>
                  {detail && (
                    <p className="text-xs text-gray-500 truncate">
                      {vehicleLabel(detail)}{detail.shop_name ? ` · ${detail.shop_name}` : ''}{detail.occurred_on ? ` · ${detail.occurred_on}` : ''}
                    </p>
                  )}
                </div>
                <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              {detail && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mr-1">Read-only</span>
                  <button onClick={() => setDetailTab('chat')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${detailTab === 'chat' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Synth chat
                  </button>
                  <button onClick={() => setDetailTab('scan')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${detailTab === 'scan' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Scan & details
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {detailLoading && <div className="p-6 text-sm text-gray-500">Loading…</div>}

              {detail && detailTab === 'chat' && (
                <div className="p-4 space-y-3 bg-gray-50/50 min-h-full">
                  {Array.isArray(detail.messages) && detail.messages.length > 0 ? (
                    detail.messages
                      .filter((m) => (m.content || '').trim() !== '')
                      .map((m, i) => {
                        const isUser = (m.role || '').toLowerCase() === 'user';
                        return (
                          <div key={m.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                              <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isUser ? 'text-blue-100' : 'text-teal-600'}`}>
                                {isUser ? 'User' : 'Synth'}
                              </div>
                              <div dangerouslySetInnerHTML={formatContent(m.content || '')} />
                            </div>
                          </div>
                        );
                      })
                  ) : detail.conversation_log && detail.conversation_log.trim() !== '' ? (
                    <pre className="text-sm bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-gray-700">{detail.conversation_log}</pre>
                  ) : (
                    <div className="p-6 text-sm text-gray-500 text-center">No chat was recorded for this scan.</div>
                  )}
                </div>
              )}

              {detail && detailTab === 'scan' && (
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{vehicleLabel(detail)}{detail.vehicle_engine ? ` · ${detail.vehicle_engine}` : ''}</p>
                    <p className="text-sm text-gray-500">
                      {detail.shop_name || 'No shop'}{detail.user_email ? ` · ${detail.user_email}` : ''}{detail.occurred_on ? ` · ${detail.occurred_on}` : ''}
                    </p>
                    {detail.vin && <p className="text-xs text-gray-400 mt-0.5">VIN: {detail.vin}{detail.mileage ? ` · ${detail.mileage.toLocaleString()} mi` : ''}</p>}
                    {detail.dtc_codes && detail.dtc_codes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {detail.dtc_codes.map((c, i) => <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">{c}</span>)}
                      </div>
                    )}
                  </div>

                  {detail.complaint && <Section title="Complaint" body={detail.complaint} />}
                  {detail.initial_diagnosis && <Section title="Initial diagnosis" body={detail.initial_diagnosis} />}
                  {detail.final_diagnosis && <Section title="Final diagnosis" body={detail.final_diagnosis} />}
                  {detail.repair_performed && <Section title="Repair performed" body={detail.repair_performed} />}
                  {detail.parts_replaced && <Section title="Parts replaced" body={detail.parts_replaced} />}

                  {detail.diagnostic_data != null && String(detail.diagnostic_data).trim() !== '' && String(detail.diagnostic_data) !== 'null' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-1"><FileText className="w-4 h-4 text-purple-600" />Submitted scan data</h3>
                      <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap max-h-72 overflow-y-auto text-gray-700">{typeof detail.diagnostic_data === 'string' ? detail.diagnostic_data : JSON.stringify(detail.diagnostic_data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
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
