'use client';

// Case Studies — read-only browser over Mike's verified training corpus
// (source='training', 1,377 rows). No writes. Click a case to see full diagnosis.

import { useState, useEffect, useCallback, useMemo } from 'react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const navy = '#1B3A6B';
const teal = '#2E75B6';

type CaseSummary = {
  id: string;
  title: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  dtc_codes: string[] | null;
  repair_type: string | null;
  vehicle_system: string | null;
  confirmed_date: string | null;
  created_at: string;
};

type CaseDetail = CaseSummary & {
  vin: string | null;
  complaint: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  fix: string | null;
  repair_recommendation: string | null;
  technical_notes: string | null;
  key_pid_pattern: string | null;
  full_content: string | null;
  confidence_score: number | null;
  diagnosis_outcome: string | null;
};

async function fetchSummaries(): Promise<CaseSummary[]> {
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase not configured');
  const select = 'id,title,year,make,model,engine,dtc_codes,repair_type,vehicle_system,confirmed_date,created_at';
  const url = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?source=eq.training&select=${select}&order=created_at.desc&limit=1500`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } });
  if (!res.ok) throw new Error(`Couldn't load cases (HTTP ${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchDetail(id: string): Promise<CaseDetail | null> {
  if (!SUPABASE_ANON_KEY) return null;
  const select = 'id,title,year,make,model,engine,vin,dtc_codes,complaint,symptoms,diagnosis,fix,repair_recommendation,technical_notes,key_pid_pattern,full_content,confidence_score,diagnosis_outcome,repair_type,vehicle_system,confirmed_date,created_at';
  const url = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?id=eq.${encodeURIComponent(id)}&select=${select}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export default function CaseStudiesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, CaseDetail | 'loading' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSummaries();
      setCases(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive filter options from data
  const makes = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.make) set.add(c.make); });
    return Array.from(set).sort();
  }, [cases]);

  const systems = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => { if (c.vehicle_system) set.add(c.vehicle_system); });
    return Array.from(set).sort();
  }, [cases]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter(c => {
      if (makeFilter && c.make !== makeFilter) return false;
      if (systemFilter && c.vehicle_system !== systemFilter) return false;
      if (!q) return true;
      const haystack = [
        c.title, c.make, c.model, c.engine, String(c.year || ''),
        ...(c.dtc_codes || []),
        c.repair_type, c.vehicle_system,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [cases, query, makeFilter, systemFilter]);

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
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>Case Studies</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>
          {loading ? 'Loading…' : `${cases.length} verified cases from Mike's diagnostic corpus`}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by vehicle, DTC, repair type…"
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
        {systems.length > 0 && (
          <select
            value={systemFilter}
            onChange={e => setSystemFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0', fontSize: 13, outline: 'none', color: navy, background: 'white' }}
          >
            <option value="">All systems</option>
            {systems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>Loading case corpus…</div>
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
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: navy }}>No cases match your filter</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            Showing {filtered.length} of {cases.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(c => (
              <CaseCard
                key={c.id}
                summary={c}
                expanded={expandedId === c.id}
                detail={detailCache[c.id]}
                onToggle={() => toggle(c.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CaseCard({
  summary, expanded, detail, onToggle,
}: {
  summary: CaseSummary;
  expanded: boolean;
  detail: CaseDetail | 'loading' | 'error' | undefined;
  onToggle: () => void;
}) {
  const vehicleLine = [summary.year, summary.make, summary.model, summary.engine].filter(Boolean).join(' ');
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
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: navy, flex: 1, minWidth: 0 }}>
          {summary.title || vehicleLine || 'Untitled case'}
        </h3>
        <span style={{ fontSize: 11, color: '#AAA', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {summary.dtc_codes && summary.dtc_codes.length > 0 && summary.dtc_codes.map((d, i) => (
          <span key={i} style={{
            fontFamily: 'monospace', fontSize: 11, color: teal,
            background: '#F0F6FB', padding: '2px 8px', borderRadius: 6, fontWeight: 700,
          }}>{d}</span>
        ))}
        {summary.repair_type && (
          <span style={{ fontSize: 11, color: '#666', background: '#F4F4F4', padding: '2px 8px', borderRadius: 999 }}>
            {summary.repair_type}
          </span>
        )}
        {summary.vehicle_system && (
          <span style={{ fontSize: 11, color: '#666', background: '#F4F4F4', padding: '2px 8px', borderRadius: 999 }}>
            {summary.vehicle_system}
          </span>
        )}
        {summary.confirmed_date && (
          <span style={{ fontSize: 11, color: '#999' }}>
            Confirmed {new Date(summary.confirmed_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
          {detail === 'loading' && (
            <div style={{ fontSize: 13, color: '#888' }}>Loading details…</div>
          )}
          {detail === 'error' && (
            <div style={{ fontSize: 13, color: '#E74C3C' }}>Couldn&apos;t load details. Try again.</div>
          )}
          {detail && detail !== 'loading' && detail !== 'error' && (
            <CaseDetailBody detail={detail} />
          )}
        </div>
      )}
    </div>
  );
}

function CaseDetailBody({ detail }: { detail: CaseDetail }) {
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
      <Field label="Complaint" value={detail.complaint} />
      <Field label="Symptoms" value={detail.symptoms} />
      <Field label="Key PID pattern" value={detail.key_pid_pattern} />
      <Field label="Diagnosis" value={detail.diagnosis} />
      <Field label="Fix" value={detail.fix} />
      <Field label="Repair recommendation" value={detail.repair_recommendation} />
      <Field label="Technical notes" value={detail.technical_notes} />
      {detail.confidence_score != null && (
        <Field label="Confidence" value={`${(detail.confidence_score * 100).toFixed(0)}%`} />
      )}
    </div>
  );
}
