'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, ChevronLeft, ChevronDown, ChevronRight, MessageSquare, Wrench, Activity, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface UserEvent {
  id: string; created_at: string; session_id: string | null; event_type: string;
  vehicle: string | null; dtc_codes: string[] | null; source: string; path?: string | null;
}
interface ChatMsg { role?: string; content?: string }
interface Diagnostic {
  session_id: string; title: string | null; dtc_codes: string[] | null; last_step: string | null;
  created_at: string; messages: ChatMsg[] | null; msg_count: number;
  diagnosis: string | null; root_cause: string | null; resolution: string | null;
  outcome_status: string | null; cost_saved: number | null;
}
interface Signals {
  scans: number; reports: number; synth_messages: number; chat_sessions_count: number;
  engaged_sessions: number; engaged_minutes: number; first_seen: string | null; last_seen: string | null;
}
interface Profile {
  id: string; email: string | null; full_name: string | null; name: string | null;
  first_name: string | null; last_name: string | null; role: string | null;
  shop_name: string | null; shop_city: string | null; shop_state: string | null;
  sub_status: string | null; plan_type: string | null;
}
interface SynthUsage { calls: number; total_cost_usd: number }

function friendlyPage(path: string | null | undefined): string {
  if (!path) return '';
  const p = path.split('?')[0].replace(/\/+$/, '');
  const map: Record<string, string> = {
    '/app': 'Home', '/app/chat': 'Chat', '/app/history': 'Auto History', '/app/reports': 'Reports',
    '/app/billing': 'Billing', '/app/settings': 'Settings', '/app/profile': 'Profile',
    '/app/sync': 'Sync', '/app/referrals': 'Referrals', '/app/notifications': 'Notifications',
  };
  if (map[p]) return map[p];
  const last = p.split('/').filter(Boolean).pop() || '';
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : p;
}
function fmtMin(m: number): string {
  if (!m) return '0 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const EVENT_META: Record<string, { label: string; color: string }> = {
  login: { label: 'Logged in', color: 'bg-gray-400' },
  scan_started: { label: 'Started a scan', color: 'bg-blue-500' },
  pdf_uploaded: { label: 'Uploaded a PDF', color: 'bg-indigo-500' },
  codes_entered: { label: 'Entered DTC codes', color: 'bg-violet-500' },
  synth_message_sent: { label: 'Asked Synth', color: 'bg-cyan-500' },
  report_generated: { label: 'Generated a report', color: 'bg-green-500' },
  feedback_submitted: { label: 'Submitted feedback', color: 'bg-amber-500' },
  session_started: { label: 'Opened', color: 'bg-slate-400' },
  session_ended: { label: 'Left', color: 'bg-slate-500' },
  page_view: { label: 'Viewed', color: 'bg-sky-400' },
};

function ActivityInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const userId = String(params?.id || '');
  const emailHint = search.get('email') || '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [signals, setSignals] = useState<Signals | null>(null);
  const [diags, setDiags] = useState<Diagnostic[] | null>(null);
  const [usage, setUsage] = useState<SynthUsage | null>(null);
  const [events, setEvents] = useState<UserEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const rpc = useCallback(async (fn: string, body: Record<string, unknown>) => {
    const tok = useAuthStore.getState().token || SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  }, []);

  const load = useCallback(async () => {
    if (!userId || !SUPABASE_ANON_KEY) { setLoading(false); return; }
    setLoading(true);
    const [p, s, d, u] = await Promise.all([
      rpc('admin_user_detail', { p_user_id: userId }),
      rpc('admin_user_signals', { p_user_id: userId }),
      rpc('admin_user_diagnostics', { p_user_id: userId }),
      rpc('admin_user_synth_usage', { p_email: emailHint || null }).catch(() => null),
    ]);
    setProfile(Array.isArray(p) ? p[0] : p);
    setSignals(Array.isArray(s) ? s[0] : s);
    setDiags(Array.isArray(d) ? d : []);
    setUsage(Array.isArray(u) ? u[0] : u);
    if (Array.isArray(d) && d[0]) setOpenChat(d[0].session_id);
    setLoading(false);
  }, [userId, emailHint, rpc]);

  const loadEvents = useCallback(async () => {
    const e = await rpc('admin_user_engagements', { p_user_id: userId });
    setEvents(Array.isArray(e) ? e : []);
  }, [userId, rpc]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showTimeline && events === null) loadEvents(); }, [showTimeline, events, loadEvents]);

  const displayName =
    (profile && (profile.full_name || profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(' '))) ||
    (profile?.email ? profile.email.split('@')[0] : emailHint.split('@')[0] || 'User');
  const loc = profile ? [profile.shop_city, profile.shop_state].filter(Boolean).join(', ') : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile?.email || emailHint}
              {profile?.role ? <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">{profile.role}</span> : null}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {profile?.shop_name ? `${profile.shop_name}${loc ? ` · ${loc}` : ''}` : 'No shop'}
              {profile?.sub_status ? <span className="ml-2 text-gray-400">· {profile.sub_status}{profile.plan_type ? ` (${profile.plan_type})` : ''}</span> : null}
            </p>
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Diagnostics" value={signals?.chat_sessions_count ?? '—'} icon={<Wrench className="w-4 h-4" />} />
          <Stat label="Reports" value={signals?.reports ?? '—'} icon={<Zap className="w-4 h-4" />} />
          <Stat label="Engaged time" value={signals ? fmtMin(signals.engaged_minutes) : '—'} sub={signals ? `${signals.engaged_sessions} session${signals.engaged_sessions === 1 ? '' : 's'}` : ''} icon={<Activity className="w-4 h-4" />} />
          <Stat label="Last active" value={signals?.last_seen ? formatRelativeTime(new Date(signals.last_seen)) : '—'} icon={<MessageSquare className="w-4 h-4" />} />
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Diagnostics & Chat</h2>
          {loading && <div className="p-6 text-sm text-gray-400 bg-white rounded-xl border border-gray-100 text-center">Loading…</div>}
          {!loading && diags && diags.length === 0 && (
            <div className="p-6 text-sm text-gray-400 bg-white rounded-xl border border-gray-100 text-center">No diagnostics or chats yet.</div>
          )}
          {!loading && diags && diags.map((d) => {
            const open = openChat === d.session_id;
            return (
              <div key={d.session_id} className="mb-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenChat(open ? null : d.session_id)} className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      <span className="font-semibold text-gray-900 truncate">{d.title || 'Diagnostic'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      {new Date(d.created_at).toLocaleDateString()} · {d.msg_count} message{d.msg_count === 1 ? '' : 's'}
                      {d.dtc_codes && d.dtc_codes.length ? ` · ${d.dtc_codes.join(', ')}` : ''}
                    </p>
                    {(d.diagnosis || d.resolution) && (
                      <p className="text-xs text-gray-600 mt-1 ml-6 line-clamp-2">{d.resolution || d.diagnosis}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {d.outcome_status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.outcome_status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.outcome_status}</span>
                    )}
                    {typeof d.cost_saved === 'number' && d.cost_saved > 0 && (
                      <p className="text-xs text-green-600 mt-1">${d.cost_saved} saved</p>
                    )}
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {(d.diagnosis || d.root_cause || d.resolution) && (
                      <div className="my-3 p-3 rounded-lg bg-gray-50 text-sm space-y-1">
                        {d.diagnosis && <p><span className="text-gray-400">Diagnosis: </span>{d.diagnosis}</p>}
                        {d.root_cause && <p><span className="text-gray-400">Root cause: </span>{d.root_cause}</p>}
                        {d.resolution && <p><span className="text-gray-400">Resolution: </span>{d.resolution}</p>}
                      </div>
                    )}
                    <div className="space-y-2 mt-3 max-h-96 overflow-y-auto">
                      {(d.messages || []).length === 0 && <p className="text-xs text-gray-400 italic">No messages stored for this session.</p>}
                      {(d.messages || []).map((m, i) => (
                        <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                          <span className={`inline-block px-3 py-2 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{m.content || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {usage && (
          <div className="mb-6 flex items-center gap-6 text-sm text-gray-500 px-4 py-3 bg-white rounded-xl border border-gray-100">
            <span><span className="font-semibold text-gray-900">{usage.calls}</span> Synth calls</span>
            <span><span className="font-semibold text-gray-900">${usage.total_cost_usd?.toFixed(2)}</span> est. cost</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50">
            <span className="text-sm font-semibold text-gray-600">Full activity timeline</span>
            {showTimeline ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {showTimeline && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {events === null && <p className="text-sm text-gray-400 py-4">Loading…</p>}
              {events && events.length === 0 && <p className="text-sm text-gray-400 py-4">No activity recorded.</p>}
              {events && events.length > 0 && (
                <ol className="relative border-l border-gray-200 ml-2 mt-3">
                  {events.map((e) => {
                    const meta = EVENT_META[e.event_type] || { label: e.event_type, color: 'bg-gray-300' };
                    const page = friendlyPage(e.path);
                    let label = meta.label;
                    if (page && ['page_view', 'session_ended', 'session_started'].includes(e.event_type)) label = `${meta.label} ${page}`;
                    const codes = Array.isArray(e.dtc_codes) ? e.dtc_codes.filter(Boolean) : [];
                    return (
                      <li key={e.id} className="mb-4 ml-4">
                        <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${meta.color} border-2 border-white`} />
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <time className="text-xs text-gray-400 shrink-0">{formatRelativeTime(new Date(e.created_at))}</time>
                        </div>
                        {(e.vehicle || codes.length > 0) && (
                          <p className="text-xs text-gray-500 mt-0.5">{e.vehicle}{codes.length > 0 && <span className="ml-2 text-gray-400">{codes.join(', ')}</span>}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
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
