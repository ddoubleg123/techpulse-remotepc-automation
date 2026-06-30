'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface UserDetail {
  id: string;
  email: string | null;
  full_name: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  address: string | null;
  business_name: string | null;
  business_address: string | null;
  onboarding_completed: boolean | null;
  membership_active: boolean | null;
  created_at: string | null;
  shop_id: string | null;
  shop_name: string | null;
  shop_city: string | null;
  shop_state: string | null;
  sub_status: string | null;
  plan_type: string | null;
  scan_count: number | null;
}

interface Engagement {
  created_at: string;
  event_type: string;
  step: string | null;
  vehicle: string | null;
  dtc_codes: string[] | null;
  path: string | null;
  source: string | null;
  session_id: string | null;
}

interface ChatMsg { role?: string; content?: string }
interface ChatSession {
  session_id: string;
  title: string | null;
  dtc_codes: string[] | null;
  last_step: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatMsg[] | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm ${empty ? 'text-gray-300 italic' : 'text-gray-900'}`}>{empty ? 'not provided' : value}</p>
    </div>
  );
}

export default function UserDetailModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'profile' | 'engagements' | 'chat'>('profile');
  const [engagements, setEngagements] = useState<Engagement[] | null>(null);
  const [chats, setChats] = useState<ChatSession[] | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const callRpc = useCallback(async (fn: string, id: string) => {
    const tok = useAuthStore.getState().token || SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: id }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, []);

  // Lazy-load the active tab's data the first time it's opened.
  useEffect(() => {
    if (!userId) return;
    if (tab === 'engagements' && engagements === null) {
      setSubLoading(true);
      callRpc('admin_user_engagements', userId)
        .then((j) => setEngagements(Array.isArray(j) ? j : []))
        .catch(() => setEngagements([]))
        .finally(() => setSubLoading(false));
    } else if (tab === 'chat' && chats === null) {
      setSubLoading(true);
      callRpc('admin_user_chats', userId)
        .then((j) => setChats(Array.isArray(j) ? j : []))
        .catch(() => setChats([]))
        .finally(() => setSubLoading(false));
    }
  }, [tab, userId, engagements, chats, callRpc]);


  const load = useCallback(async (id: string) => {
    setLoading(true); setErr(''); setData(null);
    try {
      const tok = useAuthStore.getState().token || SUPABASE_ANON_KEY;
      if (!SUPABASE_ANON_KEY) { setErr('Missing config.'); setLoading(false); return; }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_user_detail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_id: id }),
      });
      if (!res.ok) { setErr('Could not load this user.'); setLoading(false); return; }
      const j = await res.json();
      const row = Array.isArray(j) ? j[0] : j;
      if (!row) { setErr('User not found.'); }
      else setData(row);
    } catch { setErr('Network error.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (userId) { setTab('profile'); setEngagements(null); setChats(null); load(userId); }
  }, [userId, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (userId) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userId, onClose]);

  if (!userId) return null;

  const displayName =
    (data && (data.full_name || data.name || [data.first_name, data.last_name].filter(Boolean).join(' '))) ||
    (data && data.email ? data.email.split('@')[0] : 'User');

  const loc = data ? [data.shop_city, data.shop_state].filter(Boolean).join(', ') : '';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-900 text-lg truncate pr-4">
            {loading ? 'Loading…' : displayName}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0" title="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {data && (
          <div className="flex gap-1 px-5 pt-3 border-b border-gray-100 sticky top-[57px] bg-white z-10">
            {(['profile','engagements','chat'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium rounded-t-lg ${tab===t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'profile' ? 'Profile' : t === 'engagements' ? 'Engagements' : 'Chat'}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-3">
          {loading && <p className="text-sm text-gray-500 py-6 text-center">Loading user…</p>}
          {err && <p className="text-sm text-red-600 py-6 text-center">{err}</p>}
          {data && tab === 'profile' && (
            <>
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Contact</p>
                <Field label="Email" value={data.email} />
                <Field label="Phone" value={data.phone} />
                <Field label="Role" value={data.role} />
                <Field label="Address" value={data.address || data.business_address} />
              </div>

              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-3">Shop</p>
                <Field label="Shop" value={data.shop_name ? `${data.shop_name}${loc ? ` · ${loc}` : ''}` : null} />
                <Field label="Business name" value={data.business_name} />
                <Field label="Subscription" value={data.sub_status ? `${data.sub_status}${data.plan_type ? ` (${data.plan_type})` : ''}` : null} />
                <Field label="Successful scans (since gate launch)" value={typeof data.scan_count === 'number' ? data.scan_count : null} />
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-3">Account</p>
                <Field label="Onboarding" value={data.onboarding_completed ? 'Completed' : 'Not completed'} />
                <Field label="Membership" value={data.membership_active === false ? 'Inactive' : 'Active'} />
                <Field label="Joined" value={data.created_at ? new Date(data.created_at).toLocaleString() : null} />
                <Field label="User ID" value={<span className="font-mono text-xs">{data.id}</span>} />
              </div>

              <button
                onClick={() => router.push(`/admin/users/${encodeURIComponent(data.id)}/activity?email=${encodeURIComponent(data.email || '')}&hours=168`)}
                className="w-full mt-1 mb-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                View full activity →
              </button>
            </>
          )}

          {data && tab === 'engagements' && (
            <div className="py-1">
              {subLoading && <p className="text-sm text-gray-500 py-6 text-center">Loading activity…</p>}
              {!subLoading && engagements && engagements.length === 0 && (
                <p className="text-sm text-gray-400 italic py-6 text-center">No engagement events recorded.</p>
              )}
              {!subLoading && engagements && engagements.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {engagements.map((e, i) => (
                    <li key={i} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{e.event_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400 shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      {(e.vehicle || (e.dtc_codes && e.dtc_codes.length) || e.path) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[e.vehicle, e.dtc_codes && e.dtc_codes.length ? e.dtc_codes.join(', ') : null, e.path]
                            .filter(Boolean).join(' · ')}
                          {e.source ? <span className="ml-1 text-gray-300">({e.source})</span> : null}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {data && tab === 'chat' && (
            <div className="py-1">
              {subLoading && <p className="text-sm text-gray-500 py-6 text-center">Loading chats…</p>}
              {!subLoading && chats && chats.length === 0 && (
                <p className="text-sm text-gray-400 italic py-6 text-center">No saved chat sessions.</p>
              )}
              {!subLoading && chats && chats.map((c) => (
                <div key={c.session_id} className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{c.title || 'Diagnostic'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleString()}
                      {c.dtc_codes && c.dtc_codes.length ? ` · ${c.dtc_codes.join(', ')}` : ''}
                      {c.last_step ? ` · ${c.last_step}` : ''}
                    </p>
                  </div>
                  <div className="px-3 py-2 space-y-2 max-h-72 overflow-y-auto">
                    {(c.messages || []).length === 0 && (
                      <p className="text-xs text-gray-400 italic">No messages stored for this session.</p>
                    )}
                    {(c.messages || []).map((m, i) => (
                      <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-block px-3 py-1.5 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          {m.content || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
