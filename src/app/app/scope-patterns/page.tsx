'use client';

import { useEffect, useState, useMemo } from 'react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Pattern = {
  id: string;
  name?: string | null;
  title?: string | null;
  pattern_name?: string | null;
  description?: string | null;
  measurement_points?: string | null;
  pattern_type?: string | null;
  category?: string | null;
  vehicle_make?: string | null;
  platform?: string | null;
  [key: string]: unknown;
};

function patternLabel(p: Pattern): string {
  return (p.name as string) || (p.title as string) || (p.pattern_name as string) || 'Untitled pattern';
}

function patternMeta(p: Pattern): string {
  const parts = [p.pattern_type, p.category, p.vehicle_make, p.platform].filter(Boolean) as string[];
  return parts.join(' • ');
}

function isImageUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  return /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(s) || s.includes('storage/v1/object/public');
}

export default function ScopePatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Pattern | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!SUPABASE_ANON_KEY) {
        setLoading(false);
        setError('Supabase anon key not configured');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/scope_patterns?select=*&limit=2000`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Couldn't load scope patterns (HTTP ${res.status}). ${body.slice(0, 120)}`);
        }
        const rows = await res.json();
        if (!cancelled) setPatterns(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load scope patterns');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patterns;
    return patterns.filter(p => {
      const fields = [
        p.name, p.title, p.pattern_name, p.description,
        p.pattern_type, p.category, p.vehicle_make, p.platform
      ];
      return fields.some(f => f && String(f).toLowerCase().includes(q));
    });
  }, [patterns, query]);

  const withImages = useMemo(
    () => filtered.filter(p => isImageUrl(p.measurement_points || undefined)),
    [filtered]
  );
  const withoutImages = useMemo(
    () => filtered.filter(p => !isImageUrl(p.measurement_points || undefined)),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white">Scope Patterns</h2>
          <p className="text-slate-400 text-sm mt-1">
            Reference library of oscilloscope waveform patterns. Click any card to enlarge.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search patterns..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 w-full sm:w-72 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && (
        <div className="text-slate-400 text-sm p-4">Loading scope patterns...</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && patterns.length === 0 && (
        <div className="p-8 rounded-lg bg-slate-800 border border-slate-700 text-center">
          <p className="text-slate-300 font-medium mb-1">No scope patterns available</p>
          <p className="text-slate-500 text-sm">The pattern library is not yet populated for this workspace.</p>
        </div>
      )}

      {!loading && !error && patterns.length > 0 && (
        <>
          <div className="text-slate-400 text-xs">
            Showing {filtered.length} of {patterns.length} patterns
            {withImages.length > 0 ? ` • ${withImages.length} with waveform images` : ''}
          </div>

          {withImages.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Waveform Library
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {withImages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg overflow-hidden transition-colors"
                  >
                    <div className="aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.measurement_points as string}
                        alt={patternLabel(p)}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-white text-sm font-medium truncate">{patternLabel(p)}</div>
                      {patternMeta(p) && (
                        <div className="text-slate-400 text-xs mt-1 truncate">{patternMeta(p)}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {withoutImages.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Text-Based Patterns
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {withoutImages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
                  >
                    <div className="text-white text-sm font-medium truncate">{patternLabel(p)}</div>
                    {patternMeta(p) && (
                      <div className="text-slate-400 text-xs mt-1 truncate">{patternMeta(p)}</div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-white">{patternLabel(selected)}</h3>
                {patternMeta(selected) && (
                  <p className="text-slate-400 text-sm mt-1">{patternMeta(selected)}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none px-2"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              {isImageUrl(selected.measurement_points || undefined) ? (
                <div className="bg-slate-950 rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.measurement_points as string}
                    alt={patternLabel(selected)}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                selected.measurement_points && (
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-950 p-3 rounded">
                    {String(selected.measurement_points)}
                  </pre>
                )
              )}
              {selected.description && (
                <div className="mt-4">
                  <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-1">Description</h4>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{String(selected.description)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
