'use client';

// TSB Browser — read-only over tsb_cache (1,001 Technical Service Bulletins).
// Filter by make, year range, DTC. Click to expand for root cause + fix.

import { useState, useEffect, useCallback, useMemo } from 'react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const navy = '#1B3A6B';
const teal = '#2E75B6';

type TSBSummary = {
  id: string;
  tsb_number: string | null;
  title: string | null;
  make: string | null;
  model: string | null;
  year_start: number | null;
  year_end: number | null;
  dtc_codes: string[] | null;
  symptoms: string | null;
  source: string | null;
  cached_date: string | null;
};

type TSBDetail = TSBSummary & {
  summary: string | null;
  root_cause: string | null;
  fix_procedure: string | null;
  source_ref: string | null;
  vin_prefix: string | null;
};

async function fetchSummaries(): Promise<TSBSummary[]> {
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase not configured');
  const select = 'id,tsb_number,title,make,model,year_start,year_end,dtc_codes,symptoms,source,cached_date';
  const url = `${SUPABASE_URL}/rest/v1/tsb_cache?select=${select}&order=cached_date.desc.nullslast&limit=1500`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } });
  if (!res.ok) throw new Error(`Couldn't load TSBs (HTTP ${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchDetail(id: string): Promise<TSBDetail | null> {
  if (!SUPABASE_ANON_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/tsb_cache?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export default function TSBsPage() {
  const [tsbs, setTsbs] = useState<TSBSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, TSBDetail | 'loading' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSummaries();
      setTsbs(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load TSBs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const makes = useMemo(() => {
    const set = new Set<string>();
    tsbs.forEach(t => { if (t.make) set.add(t.make); });
    return Array.from(set).sort();
  }, [tsbs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tsbs.filter(t => {
      if (makeFilter && t.make !== makeFilter) return false;
      if (!q) return true;
      const haystack = [
        t.tsb_number, t.title, t.make, t.model, t.symptoms,
        String(t.year_start || ''), String(t.year_end || ''),
        ...(t.dtc_codes || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [tsbs, query, makeFilter]);

  const toggle = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (detailCache[id] && detailCache[id] !== 'error') return;
    setDetailCache(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const detail = await fetchDetail(id);
      setDetailCache(prev => ({ ...prev, [id]: detail || 'error' }));
    } catch {
      setDetailCache(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>Technical Service Bulletins</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
          {loading ? 'Loading…' : `${tsbs.length} TSBs in cache`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by TSB#, vehicle, DTC, symptom…"
          style={{
            flex: 1, minWidth: 240,
            padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0',
            fontSize: 13, outline: 'none', color: navy,
          }}
        />
        {makes.length > 0 && (
          <select
            value={makeFilter}
            onChange={e => setMakeFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0', fontSize: 13, outline: 'none', color: navy, background: 'white' }}
          >
            <option value="">All makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>Loading TSB cache…</div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button
            onClick={load}
            style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${navy}, ${teal})`, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 56, textAlign: 'center', color: '#888' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: navy }}>No TSBs match your filter</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            Showing {filtered.length} of {tsbs.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(t => (
              <TSBCard
                key={t.id}
                summary={t}
                expanded={expandedId === t.id}
                detail={detailCache[t.id]}
                onToggle={() => toggle(t.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TSBCard({
  summary, expanded, detail, onToggle,
}: {
  summary: TSBSummary;
  expanded: boolean;
  detail: TSBDetail | 'loading' | 'error' | undefined;
  onToggle: () => void;
}) {
  const yearRange = summary.year_start && summary.year_end
    ? (summary.year_start === summary.year_end ? String(summary.year_start) : `${summary.year_start}–${summary.year_end}`)
    : summary.year_start ? String(summary.year_start) : '';
  const vehicleLine = [yearRange, summary.make, summary.model].filter(Boolean).join(' ');

  return (
    <div
      style={{
        background: 'white', border: '1px solid #E8E8E8', borderRadius: 12,
        padding: '14px 18px', cursor: 'pointer',
        transition: 'border-color 0.15s ease',
      }}
      onClick={onToggle}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#D0D0D0'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8E8'; }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {summary.tsb_number && (
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: teal,
            background: '#F0F6FB', padding: '2px 8px', borderRadius: 6, flexShrink: 0,
          }}>{summary.tsb_number}</span>
        )}
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: navy, flex: 1, minWidth: 0 }}>
          {summary.title || vehicleLine || 'Untitled bulletin'}
        </h3>
        <span style={{ fontSize: 11, color: '#AAA', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {vehicleLine && (
          <span style={{ fontSize: 11, color: '#666', background: '#F4F4F4', padding: '2px 8px', borderRadius: 999 }}>
            {vehicleLine}
          </span>
        )}
        {summary.dtc_codes && summary.dtc_codes.length > 0 && summary.dtc_codes.map((d, i) => (
          <span key={i} style={{
            fontFamily: 'monospace', fontSize: 11, color: teal,
            background: '#F0F6FB', padding: '2px 8px', borderRadius: 6, fontWeight: 700,
          }}>{d}</span>
        ))}
        {summary.symptoms && (
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>
            {summary.symptoms.length > 80 ? summary.symptoms.slice(0, 80) + '…' : summary.symptoms}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
          {detail === 'loading' && <div style={{ fontSize: 13, color: '#888' }}>Loading details…</div>}
          {detail === 'error' && <div style={{ fontSize: 13, color: '#E74C3C' }}>Couldn&apos;t load details.</div>}
          {detail && detail !== 'loading' && detail !== 'error' && <TSBDetailBody detail={detail} />}
        </div>
      )}
    </div>
  );
}

function TSBDetailBody({ detail }: { detail: TSBDetail }) {
  const Field = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{value}</div>
      </div>
    );
  };
  return (
    <div onClick={e => e.stopPropagation()}>
      <Field label="Summary" value={detail.summary} />
      <Field label="Root cause" value={detail.root_cause} />
      <Field label="Fix procedure" value={detail.fix_procedure} />
      {detail.vin_prefix && <Field label="VIN prefix" value={detail.vin_prefix} />}
      {(detail.source || detail.source_ref) && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
          Source: {detail.source || detail.source_ref}
        </div>
      )}
    </div>
  );
}
