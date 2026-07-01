'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, ChevronLeft, Activity, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface UserEvent {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  shop_id: string | null;
  session_id: string | null;
  event_type: string;
  step: string | null;
  vehicle: string | null;
  dtc_codes: string[] | null;
  source: string;
  path?: string | null;
  payload: Record<string, unknown>;
}

interface SynthUsage {
  owner_email: string | null;
  calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  first_call: string | null;
  last_call: string | null;
}

// Map a route path to a friendly page name so "Viewed a page" becomes
// "Viewed Chat", "Left Chat", etc. Keeps the timeline legible at a glance.
function friendlyPage(path: string | null | undefined): string {
  if (!path) return '';
  const p = path.split('?')[0].replace(/\/+$/, '');
  const map: Record<string, string> = {
    '/app': 'Home',
    '/app/chat': 'Chat',
    '/app/history': 'Auto History',
    '/app/reports': 'Reports',
    '/app/billing': 'Billing',
    '/app/settings': 'Settings',
    '/app/profile': 'Profile',
    '/app/sync': 'Sync',
    '/app/referrals': 'Referrals',
    '/app/notifications': 'Notifications',
  };
  if (map[p]) return map[p];
  const last = p.split('/').filter(Boolean).pop() || '';
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : p;
}

// Human label + dot colour per event type.
const EVENT_META: Record<string, { label: string; color: string }> = {
  login:              { label: 'Logged in',          color: 'bg-gray-400' },
  scan_started:       { label: 'Started a scan',      color: 'bg-blue-500' },
  pdf_uploaded:       { label: 'Uploaded a PDF',      color: 'bg-indigo-500' },
  codes_entered:      { label: 'Entered DTC codes',   color: 'bg-violet-500' },
  synth_message_sent: { label: 'Asked Synth',         color: 'bg-cyan-500' },
  report_generated:   { label: 'Generated a report',  color: 'bg-green-500' },
  feedback_submitted: { label: 'Submitted feedback',  color: 'bg-amber-500' },
  session_started:    { label: 'Opened the app',      color: 'bg-slate-400' },
  session_heartbeat:  { label: 'Active on site',       color: 'bg-slate-300' },
  session_ended:      { label: 'Left the app',         color: 'bg-slate-500' },
  page_view:          { label: 'Viewed a page',        color: 'bg-sky-400' },
};

const RANGES = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
  { label: 'All time', hours: 0 },
];

function ActivityInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const userId = (params?.id as string) || '';
  const email = searchParams.get('email') || '';
  const hours = parseInt(searchParams.get('hours') || '168', 10) || 168; // default 7d

  const [events, setEvents] = useState<UserEvent[]>([]);
  const [usage, setUsage] = useState<SynthUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
      const since = hours > 0 ? new Date(Date.now() - hours * 3600 * 1000).toISOString() : null;

      // Timeline. Pass BOTH id and email so OTP-only rows (null user_id) match
      // by email. The RPC ANDs non-null filters, so pass only what we have.
      const actBody: Record<string, unknown> = { p_since: since, p_limit: 500 };
      if (userId) actBody.p_user_id = userId;
      else if (email) actBody.p_email = email;

      const [actRes, useRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_user_activity`, {
          method: 'POST', headers, body: JSON.stringify(actBody),
        }),
        email
          ? fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_user_synth_usage`, {
              method: 'POST', headers, body: JSON.stringify({ p_email: email, p_since: since }),
            })
          : Promise.resolve(null as unknown as Response),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setEvents(Array.isArray(data) ? data : []);
      } else {
        setErr('Could not load activity.');
        setEvents([]);
      }

      if (useRes && useRes.ok) {
        const u = await useRes.json();
        setUsage(Array.isArray(u) && u[0] ? u[0] : null);
      } else {
        setUsage(null);
      }
    } catch {
      setErr('Network error.');
      setEvents([]); setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [userId, email, hours]);

  useEffect(() => { load(); }, [load, token]);

  const setHours = (h: number) => {
    const qs = new URLSearchParams();
    if (email) qs.set('email', email);
    qs.set('hours', String(h));
    router.push(`/admin/users/${encodeURIComponent(userId)}/activity?${qs.toString()}`);
  };

  const title = email || (events[0]?.user_email) || 'User';

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/admin/active-users')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Active Users
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Activity
          </h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{title}</p>

        {/* Range selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                hours === r.hours ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Synth usage summary */}
        {usage && usage.calls > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
              <Zap className="w-4 h-4 text-cyan-500" /> Synth usage
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{usage.calls}</p>
                <p className="text-xs text-gray-500">calls</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {(usage.total_input_tokens + usage.total_output_tokens).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">tokens</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">${Number(usage.total_cost_usd).toFixed(2)}</p>
                <p className="text-xs text-gray-500">est. cost</p>
              </div>
            </div>
          </div>
        )}

        {err && <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">{err}</div>}

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {loading && events.length === 0 && (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          )}
          {!loading && events.length === 0 && (
            <div className="p-4 text-sm text-gray-500">
              No recorded activity in this period.
            </div>
          )}
          {!loading && events.length > 0 && (() => {
            // Group non-heartbeat events into sessions and compute active spans,
            // so the admin sees "how long were they here" without reading every row.
            const real = events.filter((e) => e.event_type !== 'session_heartbeat');
            const bySession = new Map<string, { first: number; last: number; pages: Set<string>; scans: number; reports: number }>();
            for (const e of real) {
              const k = e.session_id || 'unknown';
              const t = new Date(e.created_at).getTime();
              const cur = bySession.get(k) || { first: t, last: t, pages: new Set<string>(), scans: 0, reports: 0 };
              cur.first = Math.min(cur.first, t); cur.last = Math.max(cur.last, t);
              const pg = friendlyPage(e.path); if (pg) cur.pages.add(pg);
              if (e.event_type === 'scan_started') cur.scans++;
              if (e.event_type === 'report_generated') cur.reports++;
              bySession.set(k, cur);
            }
            const fmtDur = (ms: number) => {
              const m = Math.round(ms / 60000);
              if (m < 1) return '<1 min';
              if (m < 60) return `${m} min`;
              const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
            };
            const sessions = Array.from(bySession.entries()).sort((a, b) => b[1].last - a[1].last);
            return (
              <div className="mb-4 pb-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sessions</p>
                <div className="space-y-1.5">
                  {sessions.map(([sid, s]) => (
                    <div key={sid} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {new Date(s.first).toLocaleDateString()} · <span className="font-medium">{fmtDur(s.last - s.first)}</span> active
                        <span className="text-gray-400"> · {Array.from(s.pages).join(', ') || '—'}</span>
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {s.scans ? `${s.scans} scan${s.scans > 1 ? 's' : ''}` : ''}{s.scans && s.reports ? ', ' : ''}{s.reports ? `${s.reports} report${s.reports > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <ol className="relative border-l border-gray-200 ml-2">
            {events.filter((e) => e.event_type !== 'session_heartbeat').map((e) => {
              const meta = EVENT_META[e.event_type] || { label: e.event_type, color: 'bg-gray-300' };
              const codes = Array.isArray(e.dtc_codes) ? e.dtc_codes.filter(Boolean) : [];
              const page = friendlyPage(e.path);
              // For navigation events, fold the page name into the label so it
              // reads "Viewed Chat" / "Left Chat" instead of a bare "Viewed a page".
              let label = meta.label;
              if (page) {
                if (e.event_type === 'page_view') label = `Viewed ${page}`;
                else if (e.event_type === 'session_ended') label = `Left ${page}`;
                else if (e.event_type === 'session_started') label = `Opened ${page}`;
              }
              return (
                <li key={e.id} className="mb-5 ml-4">
                  <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${meta.color} border-2 border-white`} />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <time className="text-xs text-gray-400 shrink-0" title={e.created_at}>
                      {formatRelativeTime(new Date(e.created_at))}
                    </time>
                  </div>
                  {(e.vehicle || codes.length > 0) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {e.vehicle}
                      {codes.length > 0 && <span className="ml-2 text-gray-400">{codes.join(', ')}</span>}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {[e.path, e.source].filter(Boolean).join(' · ')}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function UserActivityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <ActivityInner />
    </Suspense>
  );
}
