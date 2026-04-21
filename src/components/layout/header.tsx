'use client';

import { useAuthStore } from '@/stores/authStore';
import { Search, Bell, Sun, Moon, X, FileText, Car } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const PAGE_TITLES: Record<string, string> = {
  '/app':               'Dashboard',
  '/app/chat':          'Diagnostic Chat',
  '/app/sync':          'Sync Data',
  '/app/reports':       'Reports',
  '/app/notifications': 'Notifications',
};

const DTC_RE = /^[BCPU][0-9A-F]{4}$/i;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;

interface SearchResult {
  type: 'report' | 'vin';
  title: string;
  subtitle: string;
  href: string;
}

export default function Header() {
  const { user, token } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tp-theme') as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tp-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const found: SearchResult[] = [];

    try {
      // 1. VIN decode via NHTSA
      if (VIN_RE.test(q.trim())) {
        const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${q.trim()}?format=json`);
        const data = await res.json();
        const get = (v: string) => data.Results?.find((r: any) => r.Variable === v)?.Value || '';
        const year = get('Model Year'), make = get('Make'), model = get('Model');
        if (make && make !== 'null') {
          found.push({
            type: 'vin',
            title: `${year} ${make} ${model}`.trim(),
            subtitle: `VIN: ${q.toUpperCase()}  click to start diagnostic`,
            href: `/app/chat?vin=${q.toUpperCase()}`,
          });
        }
      }

      // 2. Search diagnostic_files in Supabase
      const q_lower = q.toLowerCase();
      const isDtc = DTC_RE.test(q.trim());
      const filter = isDtc
        ? `filename=ilike.*${q.toUpperCase()}*`
        : `or=(filename.ilike.*${q}*,vehicle_make.ilike.*${q}*,vehicle_model.ilike.*${q}*,vehicle_year.ilike.*${q}*)`;
      const dbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/diagnostic_files?select=id,filename,vehicle_make,vehicle_year,vehicle_model,created_at&${filter}&order=created_at.desc&limit=8`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const rows = dbRes.ok ? await dbRes.json() : [];
      if (rows) {
        rows.forEach((row: any) => {
          const veh = [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ');
          found.push({
            type: 'report',
            title: row.filename || 'Diagnostic Report',
            subtitle: veh || new Date(row.created_at).toLocaleDateString(),
            href: '/app/reports',
          });
        });
      }
    } catch { /* silent */ }

    setResults(found);
    setLoading(false);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const title = PAGE_TITLES[pathname] ?? 'TechPulse';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  const showDropdown = open && query.length > 0;

  return (
    <header style={{
      height: 64, flexShrink: 0, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      background: 'var(--bg-header)', borderBottom: '1px solid var(--border-header)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
          {greeting}{firstName ? ', ' + firstName : ''} &nbsp;&nbsp; Welcome back
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{title}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Search */}
        <div ref={boxRef} style={{ position: 'relative' }}>
          <div
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-input)', minWidth: 220, cursor: 'text' }}
          >
            <Search size={14} color='var(--text-3)' />
            {open ? (
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if(e.key==='Escape'){setOpen(false);setQuery('');} }}
                placeholder='VIN, make, model, DTC...'
                style={{ border:'none', outline:'none', background:'transparent', fontSize:13, color:'var(--text-1)', width:180 }}
              />
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Search...</span>
            )}
            {open && query && (
              <button onClick={e=>{e.stopPropagation();setQuery('');setResults([]);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,lineHeight:1}}>
                <X size={12} color='var(--text-3)' />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{
              position:'absolute', top:'calc(100% + 6px)', right:0, width:380,
              background:'var(--bg-card,white)', border:'1px solid var(--border-card,#E0E0E0)',
              borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:1000, overflow:'hidden',
            }}>
              {loading ? (
                <div style={{padding:'16px',textAlign:'center',fontSize:13,color:'var(--text-3)'}}>Searching...</div>
              ) : results.length === 0 ? (
                <div style={{padding:'16px',textAlign:'center',fontSize:13,color:'var(--text-3)'}}>No results found</div>
              ) : results.map((r, i) => (
                <div
                  key={i}
                  onClick={() => { router.push(r.href); setOpen(false); setQuery(''); }}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom: i < results.length-1 ? '1px solid var(--border-card,#F0F0F0)' : 'none' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--hover,#F8F9FA)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                >
                  <div style={{ width:32, height:32, borderRadius:8, background: r.type==='vin' ? '#EFF4FB' : '#F0F8F0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {r.type === 'vin' ? <Car size={15} color='#1B3A6B' /> : <FileText size={15} color='#27AE60' />}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:600,color:'var(--text-1,#1B3A6B)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.title}</p>
                    <p style={{margin:0,fontSize:11,color:'var(--text-3,#888)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{ width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {theme === 'dark' ? <Sun size={16} color='var(--text-2)' /> : <Moon size={16} color='var(--text-2)' />}
        </button>

        {/* Notifications */}
        <button style={{ position:'relative', width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bell size={16} color='var(--text-2)' />
          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#00c3ff', border:'2px solid var(--bg-header)' }} />
        </button>
      </div>
    </header>
  );
}


