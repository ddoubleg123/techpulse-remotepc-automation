'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Report {
  id: string;            // session_id (unid)
  filename: string;
  vehicle_make: string;
  vehicle_year: string;
  vehicle_model: string;
  vin?: string;
  created_at: string;
}

// Row shape from diagnostic_case_studies
type CaseRow = {
  unid: string;
  year?: string | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  shop_name?: string | null;
  created_at: string;
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading…</div>}>
      <ReportsPageInner />
    </Suspense>
  );
}

function ReportsPageInner() {
  const { user } = useAuthStore();
  const shopName = user?.businessName || '';
  const searchParams = useSearchParams();
  const vinFilter = searchParams.get('vin') || '';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const navy = '#1B3A6B';
  const teal = '#2E75B6';

  const fetchReports = useCallback(async (q = '') => {
    if (!SUPABASE_ANON_KEY) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('select', 'unid,year,make,model,vin,shop_name,created_at');
      params.set('order', 'created_at.desc');
      params.set('limit', '200');
      params.set('source', 'eq.web');     // Only show user-generated web sessions, not training corpus
      if (shopName) {
        params.set('shop_name', `eq.${shopName}`);
      }
      if (vinFilter) {
        params.set('vin', `eq.${vinFilter}`);
      }
      if (q && q.trim()) {
        const term = q.trim();
        const orClause = `(year.ilike.*${term}*,make.ilike.*${term}*,model.ilike.*${term}*,vin.ilike.*${term}*)`;
        // PostgREST: ilike wildcards use * here (URLSearchParams handles % encoding)
        params.set('or', orClause);
      }
      const url = `${SUPABASE_URL}/rest/v1/diagnostic_case_studies?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error(`Couldn't load reports (HTTP ${res.status}).`);
      const rows: CaseRow[] = await res.json();
      const mapped: Report[] = (Array.isArray(rows) ? rows : []).map(r => ({
        id: r.unid,
        filename: '',
        vehicle_make: r.make || '',
        vehicle_year: r.year || '',
        vehicle_model: r.model || '',
        vin: r.vin || '',
        created_at: r.created_at,
      }));
      setReports(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [shopName, vinFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    fetchReports(searchInput);
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  const vehicleLabel = (r: Report) =>
    [r.vehicle_year, r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ') || 'Unknown Vehicle';

  const totalReports = reports.length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* VIN filter banner */}
      {vinFilter && (
        <div style={{
          background: '#F0F6FB', border: '1px solid #D0E2F2', borderRadius: 10,
          padding: '10px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: navy }}>
            Filtering by VIN: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{vinFilter}</span>
          </div>
          <Link href="/app/reports" style={{ fontSize: 12, fontWeight: 600, color: teal, textDecoration: 'none' }}>
            Clear filter ×
          </Link>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>Reports</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>Diagnostic history</p>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search VIN, make, model, year..."
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0', fontSize: 13, width: 240, outline: 'none', color: navy }}
          />
          <button type="submit" style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${navy}, ${teal})`, color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); fetchReports(''); }}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #E0E0E0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#666' }}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Reports', value: totalReports },
            { label: 'Most Recent', value: reports[0] ? formatDate(reports[0].created_at) : '' },
            { label: 'Vehicles', value: new Set(reports.map(r => [r.vehicle_make, r.vehicle_model].filter(Boolean).join(' '))).size || '' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'white', border: '1px solid #E8E8E8', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>{stat.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>Loading reports...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: '#E74C3C', fontSize: 14, marginBottom: 12 }}>{error}</p>
            <button onClick={() => fetchReports(search)} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${navy}, ${teal})`, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#888' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: navy }}>
              {search ? `No reports matching "${search}"` : 'No diagnostic reports yet'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              {search ? 'Try a different search term.' : 'Complete a diagnostic session to see your history here.'}
            </p>
          </div>
        ) : (
          reports.map((r, i) => (
            <Link
              key={r.id}
              href={`/app/diagnostic/${r.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                borderBottom: i < reports.length - 1 ? '1px solid #F0F0F0' : 'none',
                textDecoration: 'none', color: 'inherit', cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#FAFAFA'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {vehicleLabel(r)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                  {r.vin ? `VIN ${r.vin} · ` : ''}{formatDate(r.created_at)}
                </p>
              </div>
              <span style={{ fontSize: 11, color: '#AAA', flexShrink: 0 }}>VIEW</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
