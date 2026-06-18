'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Row {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  membership_active: boolean | null;
  shop_id: string | null;
  created_at: string | null;
}

const roleCls: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  shop_owner: 'bg-blue-100 text-blue-700',
  technician: 'bg-gray-100 text-gray-700',
  developer: 'bg-teal-100 text-teal-700',
  customer: 'bg-amber-100 text-amber-700',
};

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=id,email,name,role,membership_active,shop_id,created_at&order=created_at.desc`,
        { headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY } }
      );
      if (!res.ok) { setErr('Could not load users.'); setRows([]); }
      else setRows(await res.json());
    } catch {
      setErr('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, token]);

  const filtered = rows.filter((r) => {
    const hay = [r.email, r.name, r.role].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto p-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
          <ChevronLeft className="w-4 h-4" /> Admin Dashboard
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Users ({rows.length})</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email, name, role…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading users…</div>
          ) : err ? (
            <div className="p-8 text-center text-red-600 text-sm">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No users match.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.name || (r.email ? r.email.split('@')[0] : 'User')}</p>
                    <p className="text-sm text-gray-500 truncate">{r.email || '—'}</p>
                  </div>
                  {r.membership_active === false && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">inactive</span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${roleCls[r.role || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {r.role || 'user'}
                  </span>
                  {r.created_at && <span className="text-xs text-gray-400 w-24 text-right shrink-0">{formatRelativeTime(new Date(r.created_at))}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
