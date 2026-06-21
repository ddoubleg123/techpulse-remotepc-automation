'use client';

// Auto History — a dedicated page for browsing past diagnostics and continuing them.
// Left rail: flat list of this shop's sessions, newest first, with "Load more".
// Right pane: the selected diagnostic's conversation, with the ability to keep
// chatting with Synth (streams from the same /api/diagnostic/stream endpoint the
// main chat uses). Read side is the shared sessionHistory.ts helpers.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { History, Send, Car, MessageSquare, Plus, Search as SearchIcon, X, FileText } from 'lucide-react';
import { listSessions, loadSession, searchSessions, getSessionReport, type SessionSummary, type SessionDetail, type SessionReport } from '@/lib/sessionHistory';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';

type Msg = { role: 'user' | 'synth'; content: string };

function vehicleLabel(v: Record<string, unknown> | null | undefined): string {
  if (!v) return 'Unknown vehicle';
  const parts = [v.year, v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unknown vehicle';
}

function normalizeMessages(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m: any) => {
      const role = m?.role === 'user' ? 'user' : 'synth';
      const content = typeof m?.content === 'string' ? m.content : '';
      return content ? { role, content } as Msg : null;
    })
    .filter(Boolean) as Msg[];
}

function HistoryList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (s: SessionSummary) => void;
}) {
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SessionSummary[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    try {
      const page = await listSessions({ limit: 20, before });
      setItems((prev) => (before ? [...prev, ...page] : page));
      if (page.length < 20) setDone(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced server-side search across the whole shop's sessions.
  useEffect(() => {
    const term = query.trim();
    if (!term) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchSessions(term, { limit: 50 });
      setSearchResults(res);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // What the list shows: search results when searching, else the paged list.
  const displayed = searchResults !== null ? searchResults : items;

  return (
    <div style={{
      width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--border-card)', background: 'var(--bg-feed)', minHeight: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px',
        borderBottom: '1px solid var(--border-card)',
      }}>
        <History size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Auto History</span>
      </div>

      {/* Search across the shop's cars */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-card)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-input)',
        }}>
          <SearchIcon size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search make, model, DTC…"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--text-1)', width: '100%',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', padding: 0, lineHeight: 0 }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
        {searching && (
          <div style={{ padding: '16px 14px', color: 'var(--text-3)', fontSize: 13 }}>Searching…</div>
        )}

        {!searching && searchResults !== null && searchResults.length === 0 && (
          <div style={{ padding: '24px 14px', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5 }}>
            No diagnostics match “{query}”.
          </div>
        )}

        {!searching && searchResults === null && loaded && items.length === 0 && (
          <div style={{ padding: '24px 14px', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.5 }}>
            No past diagnostics yet. Finish a diagnostic in <strong style={{ color: 'var(--text-2)' }}>Diagnostic Chat</strong> and it will show up here.
          </div>
        )}

        {displayed.map((s) => {
          const active = s.session_id === selectedId;
          return (
            <button
              key={s.session_id}
              onClick={() => onSelect(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                borderRadius: 10, marginBottom: 2, cursor: 'pointer', border: '1px solid transparent',
                background: active ? 'var(--bg-nav-active)' : 'transparent',
                borderColor: active ? 'var(--border-nav-act)' : 'transparent',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget.style.background = 'var(--bg-card-hover)'); }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
            >
              <div style={{
                fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {s.title || 'Diagnostic'}
              </div>
              <div style={{
                fontSize: 11.5, color: 'var(--text-3)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {(s.dtc_codes && s.dtc_codes.length ? s.dtc_codes.join(', ') + ' \u00b7 ' : '')}
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </button>
          );
        })}

        {searchResults === null && !done && items.length > 0 && (
          <button
            onClick={() => load(items[items.length - 1]?.created_at)}
            disabled={loading}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', marginTop: 4,
              fontSize: 12, color: 'var(--text-2)', background: 'transparent',
              border: 'none', cursor: loading ? 'default' : 'pointer', borderRadius: 8,
            }}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}

function AutoHistoryInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialId = params.get('session');

  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const openSession = useCallback(async (s: SessionSummary) => {
    setSelected(s);
    setDetail(null);
    setMessages([]);
    setReport(null);
    setLoadingDetail(true);
    try {
      const d = await loadSession(s.session_id);
      setDetail(d);
      setMessages(normalizeMessages(d?.messages));
      getSessionReport(s.session_id).then(setReport);
    } finally {
      setLoadingDetail(false);
    }
    router.replace(`/app/history?session=${encodeURIComponent(s.session_id)}`);
  }, [router]);

  // Open the session named in ?session= on first load.
  useEffect(() => {
    if (!initialId || selected) return;
    (async () => {
      setLoadingDetail(true);
      try {
        const d = await loadSession(initialId);
        if (d) {
          setDetail(d);
          setMessages(normalizeMessages(d.messages));
          getSessionReport(initialId).then(setReport);
          setSelected({
            session_id: d.session_id, title: d.title, dtc_codes: d.dtc_codes,
            created_at: d.created_at, last_step: d.last_step, user_email: d.user_email,
          });
        }
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [initialId, selected]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !detail) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await fetch(SYNTH_API + '/api/diagnostic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_TOKEN },
        body: JSON.stringify({
          session_id: detail.session_id,
          message: text,
          vehicle: detail.vehicle_context || {},
        }),
      });
      if (!res.ok) {
        const why = res.status === 401
          ? 'Authentication failed — sign out and back in.'
          : `Synth is unavailable (${res.status}). Try again.`;
        setMessages((prev) => [...prev, { role: 'synth', content: why }]);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; raw += decoder.decode(value, { stream: true }); }
      let content = '';
      for (const ln of raw.split('\n')) {
        if (!ln.startsWith('data: ')) continue;
        const payload = ln.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const p = JSON.parse(payload);
          content += p.token ?? p.text ?? p.response ?? p.message ?? '';
        } catch { if (payload) content += payload; }
      }
      setMessages((prev) => [...prev, { role: 'synth', content: content || 'No response.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'synth', content: 'Could not reach Synth. Check your connection and try again.' }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, detail]);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--bg-page)' }}>
      <HistoryList selectedId={selected?.session_id ?? null} onSelect={openSession} />

      {/* Right pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!selected ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-3)', gap: 12, padding: 24, textAlign: 'center',
          }}>
            <MessageSquare size={40} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 15, color: 'var(--text-2)' }}>Select a diagnostic to review or continue it</div>
            <div style={{ fontSize: 13, maxWidth: 360 }}>
              Past diagnostics for your shop appear on the left. Open one to see the full conversation and keep working with Synth.
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px',
              borderBottom: '1px solid var(--border-card)', background: 'var(--bg-header)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'var(--bg-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Car size={17} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {detail ? vehicleLabel(detail.vehicle_context) : (selected.title || 'Diagnostic')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {(selected.dtc_codes && selected.dtc_codes.length ? selected.dtc_codes.join(', ') + ' \u00b7 ' : '')}
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>

              {report && (report.diagnosis_pdf_url || report.before_after_pdf_url || report.estimate_pdf_url) && (
                <a
                  href={(report.diagnosis_pdf_url || report.before_after_pdf_url || report.estimate_pdf_url) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    padding: '8px 14px', borderRadius: 8, textDecoration: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <FileText size={14} />
                  View Report
                </a>
              )}
            </div>

            {/* Conversation */}
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', minHeight: 0 }}>
              {loadingDetail && (
                <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading conversation…</div>
              )}
              {!loadingDetail && messages.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: 14 }}>This diagnostic has no saved messages.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820, margin: '0 auto' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%', padding: '12px 16px', borderRadius: 14, fontSize: 14.5, lineHeight: 1.55,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-synth)',
                      color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border-synth)',
                      borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                      borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '12px 16px', borderRadius: 14, fontSize: 14, color: 'var(--text-3)',
                      background: 'var(--bg-synth)', border: '1px solid var(--border-synth)',
                    }}>
                      Synth is thinking…
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border-card)', background: 'var(--bg-page)' }}>
              <div style={{ display: 'flex', gap: 10, maxWidth: 820, margin: '0 auto', alignItems: 'flex-end' }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask Synth a follow-up about this vehicle…"
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', maxHeight: 160, padding: '12px 14px', borderRadius: 12,
                    background: 'var(--bg-input)', border: '1px solid var(--border-input)',
                    color: 'var(--text-1)', fontSize: 14.5, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  style={{
                    width: 46, height: 46, borderRadius: 12, flexShrink: 0, border: 'none',
                    cursor: sending || !input.trim() ? 'default' : 'pointer',
                    background: sending || !input.trim() ? 'var(--bg-pill)' : 'var(--accent)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 120ms',
                  }}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
              <div style={{ maxWidth: 820, margin: '8px auto 0' }}>
                <button
                  onClick={() => router.push('/app/chat')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                    color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <Plus size={13} /> Start a new diagnostic
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AutoHistoryPage() {
  return (
    <Suspense fallback={null}>
      <AutoHistoryInner />
    </Suspense>
  );
}
