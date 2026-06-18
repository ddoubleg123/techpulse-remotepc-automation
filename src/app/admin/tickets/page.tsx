'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeTime } from '@/lib/utils';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface Ticket {
  id: string;
  ticket_number: string | null;
  shop_name: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  dtc_codes: string | null;
  complaint: string | null;
  notes: string | null;
  specialty: string | null;
  priority: string | null;
  status: string | null;
  tech_name: string | null;
  tech_response: string | null;
  submitter_email: string | null;
  created_at: string | null;
}

const STATUSES = ['open', 'active', 'closed'] as const;
const statusMeta: Record<string, { label: string; icon: typeof Clock; cls: string; dot: string }> = {
  open: { label: 'Open', icon: AlertCircle, cls: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  active: { label: 'Active', icon: Clock, cls: 'text-yellow-700 bg-yellow-50', dot: 'bg-yellow-500' },
  closed: { label: 'Closed', icon: CheckCircle, cls: 'text-green-700 bg-green-50', dot: 'bg-green-500' },
};
const priorityCls: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700',
  high: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-red-100 text-red-700',
};

function norm(s: string | null) {
  const v = (s || 'open').toLowerCase();
  return STATUSES.includes(v as typeof STATUSES[number]) ? v : 'open';
}
function headers() {
  const token = useAuthStore.getState().token || SUPABASE_ANON_KEY;
  return { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY };
}

export default function AdminTicketsPage() {
  const token = useAuthStore((s) => s.token);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const t = useAuthStore.getState().token;
      if (!t || !SUPABASE_ANON_KEY) { setLoading(false); return; }
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_tickets?select=id,ticket_number,shop_name,year,make,model,dtc_codes,complaint,notes,specialty,priority,status,tech_name,tech_response,submitter_email,created_at&order=created_at.desc`,
        { headers: headers() }
      );
      if (!res.ok) { setErr('Could not load tickets.'); setTickets([]); }
      else setTickets(await res.json());
    } catch {
      setErr('Could not load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, token]);

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => norm(t.status) === filter);
  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => norm(t.status) === 'open').length,
    active: tickets.filter((t) => norm(t.status) === 'active').length,
    closed: tickets.filter((t) => norm(t.status) === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto p-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
          <ChevronLeft className="w-4 h-4" /> Admin Dashboard
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <button onClick={load} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'open', 'active', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : statusMeta[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading tickets…</div>
          ) : err ? (
            <div className="p-8 text-center text-red-600 text-sm">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No tickets{filter !== 'all' ? ` with status “${filter}”` : ''}.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const s = statusMeta[norm(t.status)];
                const vehicle = [t.year, t.make, t.model].filter(Boolean).join(' ');
                const pr = (t.priority || 'normal').toLowerCase();
                return (
                  <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-500">{t.ticket_number || t.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityCls[pr] || priorityCls.normal}`}>{pr}</span>
                        <span className="text-xs text-gray-400">· {t.shop_name || 'Unknown shop'}</span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">
                        {vehicle ? `${vehicle}${t.dtc_codes ? ` — ${t.dtc_codes}` : ''}` : (t.complaint || 'No description')}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{t.complaint || t.notes || ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
                      {t.created_at && <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(new Date(t.created_at))}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setTickets((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            setSelected((cur) => (cur ? { ...cur, ...updated } : cur));
          }}
        />
      )}
    </div>
  );
}

function TicketDetail({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  onClose: () => void;
  onUpdated: (t: Partial<Ticket> & { id: string }) => void;
}) {
  const [status, setStatus] = useState(norm(ticket.status));
  const [response, setResponse] = useState(ticket.tech_response || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const body: Record<string, unknown> = { status, tech_response: response.trim() || null };
      if (response.trim()) body.responded_at = new Date().toISOString();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticket.id)}`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMsg(res.status === 403 ? 'Not authorized to update this ticket.' : 'Could not save changes.');
        setSaving(false);
        return;
      }
      onUpdated({ id: ticket.id, status, tech_response: response.trim() || null });
      setMsg('Saved.');
    } catch {
      setMsg('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const vehicle = [ticket.year, ticket.make, ticket.model].filter(Boolean).join(' ');
  const row = 'flex gap-2 text-sm py-1';
  const lbl = 'text-gray-500 w-28 shrink-0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{ticket.ticket_number || ticket.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-1">
          <div className={row}><span className={lbl}>Shop</span><span className="text-gray-900">{ticket.shop_name || '—'}</span></div>
          <div className={row}><span className={lbl}>Submitted by</span><span className="text-gray-900">{ticket.tech_name || ticket.submitter_email || '—'}</span></div>
          <div className={row}><span className={lbl}>Vehicle</span><span className="text-gray-900">{vehicle || '—'}</span></div>
          <div className={row}><span className={lbl}>DTC codes</span><span className="text-gray-900">{ticket.dtc_codes || '—'}</span></div>
          <div className={row}><span className={lbl}>Priority</span><span className="text-gray-900">{ticket.priority || '—'}</span></div>
          <div className={row}><span className={lbl}>Specialty</span><span className="text-gray-900">{ticket.specialty || '—'}</span></div>
          <div className={row}><span className={lbl}>Complaint</span><span className="text-gray-900 whitespace-pre-wrap">{ticket.complaint || '—'}</span></div>
          {ticket.notes && <div className={row}><span className={lbl}>Notes</span><span className="text-gray-900 whitespace-pre-wrap">{ticket.notes}</span></div>}

          <div className="pt-3 border-t border-gray-100 mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3">
              {STATUSES.map((s) => <option key={s} value={s}>{statusMeta[s].label}</option>)}
            </select>
            <label className="block text-xs font-medium text-gray-600 mb-1">Response to technician</label>
            <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Diagnostic guidance, next steps…" />
          </div>
          {msg && <p className={`text-sm ${msg === 'Saved.' ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
