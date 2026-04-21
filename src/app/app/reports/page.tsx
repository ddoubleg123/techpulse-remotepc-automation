'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';

const SYNTH_API = 'https://techpulse-api.onrender.com';

interface Report {
  id: string;
  filename: string;
  vehicle_make: string;
  vehicle_year: string;
  vehicle_model: string;
  created_at: string;
  file_type?: string;
}

export default function ReportsPage() {
  const { token: _userToken } = useAuthStore();
  const synthToken = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const navy = '#1B3A6B';
  const teal = '#2E75B6';

  const fetchReports = useCallback(async (q = '') => {
    if (!synthToken) return;
    setLoading(true);
    setError(null);
    try {
      const url = q
        ? `${SYNTH_API}/api/reports?search=${encodeURIComponent(q)}`
        : `${SYNTH_API}/api/reports`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${synthToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [token]);

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

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: navy }}>Reports</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888' }}>Diagnostic history  all platforms</p>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search make, model, DTC..."
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E0E0E0', fontSize: 13, width: 220, outline: 'none', color: navy }}
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
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: navy }}>
              {search ? `No reports matching "${search}"` : 'No diagnostic reports yet'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              {search ? 'Try a different search term.' : 'Complete a diagnostic session to see your history here.'}
            </p>
          </div>
        ) : (
          reports.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
              borderBottom: i < reports.length - 1 ? '1px solid #F0F0F0' : 'none',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.filename || 'Diagnostic Report'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                  {vehicleLabel(r)} &nbsp;&nbsp; {formatDate(r.created_at)}
                </p>
              </div>
              <span style={{ fontSize: 11, color: '#AAA', flexShrink: 0 }}>PDF</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


