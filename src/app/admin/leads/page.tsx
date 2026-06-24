'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Play, Mail, Download, Loader2, Table2, Map as MapIcon, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import LeadsMap from '@/components/admin/LeadsMap';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const COUNTIES = [
  'Fulton', 'Cobb', 'Cherokee', 'Forsyth', 'Gwinnett',
  'DeKalb', 'Clayton', 'Fayette', 'Coweta', 'Douglas',
];

interface LeadShop {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  owner_name: string | null;
  rating: number | null;
  review_count: number | null;
  latitude: number | null;
  longitude: number | null;
  enrichment_status: string | null;
  created_at: string | null;
}

type SortKey = 'name' | 'county' | 'email' | 'rating' | 'review_count' | 'status';

function enrichChip(s: string | null): { label: string; cls: string } {
  const v = (s || '').toLowerCase();
  if (v === 'done') return { label: 'Email found', cls: 'bg-green-100 text-green-700' };
  if (v === 'no_email') return { label: 'No email', cls: 'bg-gray-100 text-gray-500' };
  if (v === 'pending') return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
  if (v === 'failed') return { label: 'Failed', cls: 'bg-red-100 text-red-700' };
  return { label: v || '—', cls: 'bg-gray-100 text-gray-500' };
}

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [countyFilter, setCountyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zipFilter, setZipFilter] = useState('all');
  const [view, setView] = useState<'table' | 'map'>('table');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('review_count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // pipeline run state
  const [running, setRunning] = useState<string>(''); // which action is in flight
  const [runMsg, setRunMsg] = useState('');
  const [discoverCounty, setDiscoverCounty] = useState('Fulton');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelRef = useState<{ cancelled: boolean }>({ cancelled: false })[0];

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const headers = {
        Authorization: `Bearer ${t}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      };
      // Pull up to 5000 rows, newest first. PostgREST caps at 1000 per request
      // unless a Range header widens it.
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/lead_shops?select=*&order=created_at.desc`,
        { headers: { ...headers, Range: '0-4999' } }
      );
      if (!res.ok) {
        setErr(`Failed to load leads (HTTP ${res.status})`);
        setRows([]);
      } else {
        setRows(await res.json());
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset zip when county changes — a zip from another county would zero results.
  useEffect(() => { setZipFilter('all'); }, [countyFilter]);

  // Trigger a pipeline action via the server-side proxy.
  const runAction = useCallback(async (
    action: 'discovery' | 'discovery_all' | 'enrichment',
    extra?: { county?: string; limit?: number }
  ) => {
    setRunning(action); setRunMsg('');
    try {
      const res = await fetch('/api/leads/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunMsg(`⚠ ${data.error || 'Run failed'}`);
      } else {
        const r = data.result || {};
        if (action === 'discovery') {
          setRunMsg(`✓ ${extra?.county}: ${r.upserted ?? 0} shops saved (${r.unique_seen ?? 0} seen)`);
        } else if (action === 'discovery_all') {
          const total = Object.values(r as Record<string, { upserted?: number }>)
            .reduce((sum, v) => sum + (v.upserted || 0), 0);
          setRunMsg(`✓ All counties: ${total} shops saved`);
        } else {
          setRunMsg(`✓ Enriched ${r.enriched ?? 0} shops`);
        }
        await load(); // refresh the table with new rows
      }
    } catch (e) {
      setRunMsg(`⚠ ${e instanceof Error ? e.message : 'Run failed'}`);
    } finally {
      setRunning('');
    }
  }, [load]);

  // Tile-driven discovery: fetch the county's tile list, then process one tile
  // per request. Each call is fast (seconds), so nothing times out, and the
  // progress bar advances live. Rows appear in the table as we refresh.
  const runDiscoveryIncremental = useCallback(async (county: string) => {
    setRunning('discovery'); setRunMsg(''); setProgress(null);
    cancelRef.cancelled = false;
    const call = async (payload: object) => {
      const res = await fetch('/api/leads/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data.result;
    };
    try {
      const tilesResult = await call({ action: 'tiles', county });
      const total: number = tilesResult.count;
      setProgress({ done: 0, total });
      let upserted = 0;
      for (let i = 0; i < total; i++) {
        if (cancelRef.cancelled) { setRunMsg('Stopped.'); break; }
        try {
          const r = await call({ action: 'tile', county, i });
          upserted += r.upserted || 0;
        } catch (e) {
          // One tile failing (e.g. transient Google hiccup) shouldn't abort the
          // whole county — log and keep going.
          console.error(`tile ${i} failed`, e);
        }
        setProgress({ done: i + 1, total });
        // Refresh the table every few tiles so rows appear as we go.
        if ((i + 1) % 5 === 0) await load();
      }
      if (!cancelRef.cancelled) {
        setRunMsg(`✓ ${county}: ${upserted} shops saved across ${total} searches`);
      }
      await load();
    } catch (e) {
      setRunMsg(`⚠ ${e instanceof Error ? e.message : 'Discovery failed'}`);
    } finally {
      setRunning('');
      setProgress(null);
    }
  }, [load, cancelRef]);

  // Incremental enrichment: loop small batches until no shops remain pending,
  // showing live progress. Same timeout-proof pattern as discovery.
  const runEnrichmentIncremental = useCallback(async () => {
    setRunning('enrichment'); setRunMsg(''); setProgress(null);
    cancelRef.cancelled = false;
    const call = async (payload: object) => {
      const res = await fetch('/api/leads/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data.result;
    };
    const BATCH = 25;
    try {
      const start = await call({ action: 'enrichment_pending' });
      const total: number = start.pending || 0;
      if (total === 0) { setRunMsg('✓ Nothing left to enrich'); return; }
      setProgress({ done: 0, total });
      let processed = 0;
      let foundEmails = 0;
      // Hard cap iterations as a safety net against an endless loop.
      const maxIters = Math.ceil(total / BATCH) + 2;
      for (let n = 0; n < maxIters; n++) {
        if (cancelRef.cancelled) { setRunMsg('Stopped.'); break; }
        const r = await call({ action: 'enrichment', limit: BATCH });
        const did = r.enriched || 0;
        foundEmails += r.with_email || 0;
        processed += did;
        setProgress({ done: Math.min(processed, total), total });
        await load();
        if (did === 0) break; // nothing left pending
      }
      if (!cancelRef.cancelled) {
        setRunMsg(`✓ Enriched ${processed} shops — ${foundEmails} emails found`);
      }
      await load();
    } catch (e) {
      setRunMsg(`⚠ ${e instanceof Error ? e.message : 'Enrichment failed'}`);
    } finally {
      setRunning('');
      setProgress(null);
    }
  }, [load, cancelRef]);

  // Derived stats
  const stats = useMemo(() => {
    const byCounty: Record<string, number> = {};
    let withEmail = 0, pending = 0;
    for (const r of rows) {
      const c = r.county || '—';
      byCounty[c] = (byCounty[c] || 0) + 1;
      if (r.email) withEmail++;
      if ((r.enrichment_status || '') === 'pending') pending++;
    }
    return { total: rows.length, byCounty, withEmail, pending };
  }, [rows]);

  // Zip options, scoped to the selected county so the dropdown stays usable.
  const zipOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (countyFilter !== 'all' && r.county !== countyFilter) continue;
      if (r.zip) set.add(r.zip);
    }
    return Array.from(set).sort();
  }, [rows, countyFilter]);

  // Filtered view
  const filteredUnsorted = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (countyFilter !== 'all' && r.county !== countyFilter) return false;
      if (zipFilter !== 'all' && r.zip !== zipFilter) return false;
      if (statusFilter === 'has_email' && !r.email) return false;
      if (statusFilter === 'no_email' && r.email) return false;
      if (statusFilter === 'pending' && (r.enrichment_status || '') !== 'pending') return false;
      if (ql) {
        const hay = `${r.name || ''} ${r.city || ''} ${r.zip || ''} ${r.email || ''} ${r.owner_name || ''}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, countyFilter, zipFilter, statusFilter]);

  // Sorted view. Text keys sort case-insensitively; numeric keys numerically;
  // "has email" sorts rows with an email first. Nulls always sort last.
  const filtered = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const val = (r: LeadShop): string | number => {
      switch (sortKey) {
        case 'name': return (r.name || '').toLowerCase();
        case 'county': return `${r.county || ''} ${r.city || ''}`.toLowerCase();
        case 'email': return r.email ? 0 : 1; // has-email first when desc
        case 'rating': return r.rating ?? -1;
        case 'review_count': return r.review_count ?? -1;
        case 'status': return (r.enrichment_status || '').toLowerCase();
        default: return '';
      }
    };
    return [...filteredUnsorted].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredUnsorted, sortKey, sortDir]);

  // Toggle sort: click a column to sort by it; click again to flip direction.
  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // New column: text ascending, numeric/email descending by default.
      setSortDir(key === 'name' || key === 'county' || key === 'status' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const exportCsv = useCallback(() => {
    const cols = ['name', 'county', 'city', 'zip', 'address', 'phone', 'email', 'owner_name', 'website', 'rating', 'review_count', 'enrichment_status'];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(',')];
    for (const r of filtered) {
      lines.push(cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `techpulse-leads-${countyFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, countyFilter]);

  const busy = running !== '';

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Collapsible header region — hidden when the map is expanded to give
          it more vertical room (sidebar + filters stay visible). */}
      <div className={view === 'map' && mapExpanded ? 'hidden' : ''}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Lead Repository</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Auto-repair shops across Fulton + 9 adjacent metro-Atlanta counties.
      </p>

      {/* Stats header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total shops" value={stats.total} />
        <StatCard label="With email" value={stats.withEmail} accent="text-green-600" />
        <StatCard label="Enrichment pending" value={stats.pending} accent="text-amber-600" />
        <StatCard label="Counties covered" value={Object.keys(stats.byCounty).filter((c) => c !== '—').length} />
      </div>

      {/* Pipeline controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">Pipeline</div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={discoverCounty}
              onChange={(e) => setDiscoverCounty(e.target.value)}
              disabled={busy}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => runDiscoveryIncremental(discoverCounty)}
              disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {running === 'discovery' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Discover county
            </button>
          </div>

          <button
            onClick={() => runAction('discovery_all')}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            {running === 'discovery_all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Discover all 10 counties
          </button>

          <button
            onClick={() => runEnrichmentIncremental()}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {running === 'enrichment' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enrich emails
          </button>

          {runMsg && (
            <span className={`text-sm ${runMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {runMsg}
            </span>
          )}
        </div>
        {progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Searching… {progress.done} of {progress.total} area searches</span>
              <span>{Math.round((progress.done / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        {busy && !progress && (
          <p className="text-xs text-gray-400 mt-2">
            Running… first call wakes the service (~30-60s cold start).
          </p>
        )}
      </div>
      </div>{/* end collapsible header region */}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, email, owner…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="all">All counties</option>
          {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={zipFilter}
          onChange={(e) => setZipFilter(e.target.value)}
          disabled={zipOptions.length === 0}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
        >
          <option value="all">All zips</option>
          {zipOptions.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
        >
          <option value="all">All statuses</option>
          <option value="has_email">Has email</option>
          <option value="no_email">No email</option>
          <option value="pending">Enrichment pending</option>
        </select>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV ({filtered.length})
        </button>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            <Table2 className="w-4 h-4" /> Table
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === 'map' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            <MapIcon className="w-4 h-4" /> Map
          </button>
        </div>
        {view === 'map' && (
          <button
            onClick={() => setMapExpanded((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            title={mapExpanded ? 'Show details above the map' : 'Hide details to enlarge the map'}
          >
            {mapExpanded
              ? <><ChevronDown className="w-4 h-4" /> Show details</>
              : <><ChevronUp className="w-4 h-4" /> Expand map</>}
          </button>
        )}
      </div>

      {/* Map view */}
      {view === 'map' && !loading && (
        <LeadsMap shops={filtered} expanded={mapExpanded} />
      )}

      {/* Table */}
      {view === 'table' && (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {err && <div className="p-4 text-sm text-red-600">{err}</div>}
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No shops yet. Run discovery above to populate the repository.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <SortableTh label="Shop" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="County / City" col="county" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <SortableTh label="Email" col="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <SortableTh label="Rating" col="rating" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} extraClass="pr-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const chip = enrichChip(r.enrichment_status);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.name || '—'}</div>
                        {r.website && (
                          <a href={r.website} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline">
                            {r.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{r.county || '—'}</div>
                        <div className="text-xs text-gray-400">{[r.city, r.zip].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {r.email
                          ? <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.owner_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.rating != null ? `${r.rating} (${r.review_count ?? 0})` : '—'}
                      </td>
                      <td className="px-4 pr-6 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${chip.cls}`}>
                          {chip.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function SortableTh({
  label, col, sortKey, sortDir, onSort, extraClass = '',
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  extraClass?: string;
}) {
  const active = sortKey === col;
  return (
    <th className={`px-4 py-3 font-medium ${extraClass}`}>
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}
      >
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
          : <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />}
      </button>
    </th>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent || 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
