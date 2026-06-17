'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

// === Direct-to-Supabase config (same pattern as the diagnostic flow) ===
// Uses the public anon key as apikey + the user's Supabase JWT as the bearer.
// RLS (tickets_auth_insert_own_shop / tickets_auth_select_own_shop) scopes
// every read and write to the signed-in tech's own shop.
const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type TicketStatus = 'open' | 'active' | 'closed';

interface Ticket {
  id: string;
  ticket_number?: string | null;
  case_id?: string | null;
  shop_name?: string | null;
  year?: string | null;
  make?: string | null;
  model?: string | null;
  dtc_codes?: string | null;
  complaint?: string | null;
  notes?: string | null;
  specialty?: string | null;
  priority?: string | null;
  status?: string | null;
  tech_name?: string | null;
  tech_response?: string | null;
  created_at?: string | null;
}

const statusConfig: Record<TicketStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info'; icon: typeof Clock }> = {
  open: { label: 'Open', variant: 'info', icon: AlertCircle },
  active: { label: 'Active', variant: 'warning', icon: Clock },
  closed: { label: 'Closed', variant: 'success', icon: CheckCircle },
};

const priorityConfig: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700',
  high: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-red-100 text-red-700',
};

function normStatus(s?: string | null): TicketStatus {
  const v = (s || 'open').toLowerCase();
  if (v in statusConfig) return v as TicketStatus;
  return 'open';
}

// Resolve the tech's shop_id + auth sub the same way the diagnostic flow does:
// auth sub == user_profiles.id (a view over users); user_profiles.shop_id is the FK.
async function resolveIdentity(): Promise<{ sub: string; shopId: string | null; email: string }> {
  const token = useAuthStore.getState().token || '';
  let sub = '';
  try {
    sub = JSON.parse(atob(token.split('.')[1] || '')).sub || '';
  } catch {
    sub = '';
  }
  let shopId: string | null = null;
  let email = '';
  if (sub) {
    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/user_profiles?id=eq.' + encodeURIComponent(sub) + '&select=shop_id,email',
        { headers: { Authorization: 'Bearer ' + (token || SUPABASE_ANON_KEY), apikey: SUPABASE_ANON_KEY } }
      );
      if (res.ok) {
        const rows = await res.json();
        shopId = (rows && rows[0] && rows[0].shop_id) || null;
        email = (rows && rows[0] && rows[0].email) || '';
      }
    } catch {
      /* best effort */
    }
  }
  return { sub, shopId, email };
}

function buildTicketHtml(t: {
  ticketNumber: string;
  shopName: string;
  vehicle: string;
  codes: string;
  complaint: string;
  notes: string;
  specialty: string;
  priority: string;
  techName: string;
}): string {
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t.ticketNumber)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:720px;margin:32px auto;padding:0 16px}
h1{font-size:20px;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
.row{margin:10px 0}.label{font-weight:700;color:#374151;font-size:13px}.val{margin-top:2px;white-space:pre-wrap}</style></head>
<body><h1>TechPulse Support Ticket — ${esc(t.ticketNumber)}</h1>
<div class="row"><div class="label">Shop</div><div class="val">${esc(t.shopName)}</div></div>
<div class="row"><div class="label">Submitted by</div><div class="val">${esc(t.techName)}</div></div>
<div class="row"><div class="label">Priority</div><div class="val">${esc(t.priority)}</div></div>
<div class="row"><div class="label">Specialty</div><div class="val">${esc(t.specialty) || '—'}</div></div>
<div class="row"><div class="label">Vehicle</div><div class="val">${esc(t.vehicle) || '—'}</div></div>
<div class="row"><div class="label">DTC Codes</div><div class="val">${esc(t.codes) || '—'}</div></div>
<div class="row"><div class="label">Complaint</div><div class="val">${esc(t.complaint) || '—'}</div></div>
<div class="row"><div class="label">Notes</div><div class="val">${esc(t.notes) || '—'}</div></div>
</body></html>`;
}

export default function TicketsPage() {
  const user = useAuthStore((s) => s.user) as { name?: string; businessName?: string; email?: string } | null;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (!SUPABASE_ANON_KEY) {
        setLoadError('Configuration missing — contact support.');
        setLoading(false);
        return;
      }
      const token = useAuthStore.getState().token || SUPABASE_ANON_KEY;
      const res = await fetch(
        SUPABASE_URL +
          '/rest/v1/support_tickets?select=id,ticket_number,case_id,shop_name,year,make,model,dtc_codes,complaint,notes,specialty,priority,status,tech_name,tech_response,created_at&order=created_at.desc',
        { headers: { Authorization: 'Bearer ' + token, apikey: SUPABASE_ANON_KEY } }
      );
      if (!res.ok) {
        setLoadError('Could not load tickets. Please try again.');
        setTickets([]);
      } else {
        setTickets(await res.json());
      }
    } catch {
      setLoadError('Could not load tickets. Please try again.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = tickets.filter((t) => {
    const hay = [t.ticket_number, t.complaint, t.make, t.model, t.dtc_codes].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = hay.includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || normStatus(t.status) === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    open: tickets.filter((t) => normStatus(t.status) === 'open').length,
    active: tickets.filter((t) => normStatus(t.status) === 'active').length,
    closed: tickets.filter((t) => normStatus(t.status) === 'closed').length,
    total: tickets.length,
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTickets} aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open', count: counts.open, color: 'text-blue-600' },
            { label: 'Active', count: counts.active, color: 'text-yellow-600' },
            { label: 'Closed', count: counts.closed, color: 'text-green-600' },
            { label: 'Total', count: counts.total, color: 'text-gray-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tickets List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading tickets…</div>
            ) : loadError ? (
              <div className="p-8 text-center text-red-600 text-sm">{loadError}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {tickets.length === 0 ? 'No tickets yet. Create your first one.' : 'No tickets match your filters.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[normStatus(ticket.status)];
                  const vehicle = [ticket.year, ticket.make, ticket.model].filter(Boolean).join(' ');
                  const ref = ticket.ticket_number || ticket.case_id || ticket.id.slice(0, 8);
                  const priority = (ticket.priority || 'normal').toLowerCase();
                  const created = ticket.created_at ? new Date(ticket.created_at) : new Date();
                  return (
                    <div key={ticket.id} className="flex items-center gap-4 p-4">
                      <div
                        className={`p-2 rounded-lg ${
                          status.variant === 'success'
                            ? 'bg-green-100'
                            : status.variant === 'warning'
                            ? 'bg-yellow-100'
                            : status.variant === 'info'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <status.icon
                          className={`w-5 h-5 ${
                            status.variant === 'success'
                              ? 'text-green-600'
                              : status.variant === 'warning'
                              ? 'text-yellow-600'
                              : status.variant === 'info'
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">{ref}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[priority] || priorityConfig.normal}`}>
                            {priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {vehicle || 'Vehicle not specified'}
                          {ticket.dtc_codes ? ` — ${ticket.dtc_codes}` : ''}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{ticket.complaint || ticket.notes || 'No description'}</p>
                      </div>

                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {ticket.tech_response ? <MessageSquare className="w-3 h-3" /> : null}
                          {formatRelativeTime(created)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <NewTicketModal
          user={user}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadTickets();
          }}
        />
      )}
    </>
  );
}

function NewTicketModal({
  user,
  onClose,
  onCreated,
}: {
  user: { name?: string; businessName?: string; email?: string } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [codes, setCodes] = useState('');
  const [complaint, setComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const canSubmit = complaint.trim().length > 0 || codes.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrMsg('');
    try {
      if (!SUPABASE_ANON_KEY) {
        setErrMsg('Configuration missing — contact support.');
        setSubmitting(false);
        return;
      }
      const { sub, shopId, email } = await resolveIdentity();
      if (!shopId) {
        setErrMsg('Your account is not linked to a shop yet, so the ticket cannot be routed. Contact your shop owner.');
        setSubmitting(false);
        return;
      }
      const ticketNumber = 'TKT-' + Date.now().toString(36).toUpperCase();
      const techName = user?.name || email || 'Technician';
      const shopName = user?.businessName || '';

      const token = useAuthStore.getState().token || SUPABASE_ANON_KEY;
      const res = await fetch(SUPABASE_URL + '/rest/v1/support_tickets', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          ticket_number: ticketNumber,
          source_table: 'web',
          shop_id: shopId,
          submitted_by: sub || null,
          submitter_email: email || user?.email || '',
          shop_name: shopName,
          year: year.trim() || null,
          make: make.trim() || null,
          model: model.trim() || null,
          dtc_codes: codes.trim() || null,
          complaint: complaint.trim() || null,
          notes: notes.trim() || null,
          specialty: specialty || null,
          priority,
          status: 'open',
          tech_name: techName,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) setErrMsg('Please sign in again to create a ticket.');
        else if (res.status === 403) setErrMsg('You can only create tickets for your own shop.');
        else setErrMsg('Could not create the ticket. Please try again.');
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch {
      setErrMsg('Could not create the ticket. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    const ticketNumber = 'TKT-DRAFT-' + Date.now().toString(36).toUpperCase();
    const html = buildTicketHtml({
      ticketNumber,
      shopName: user?.businessName || '',
      vehicle: [year, make, model].filter(Boolean).join(' '),
      codes,
      complaint,
      notes,
      specialty,
      priority,
      techName: user?.name || user?.email || 'Technician',
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ticketNumber + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Support Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <input className={field} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Make</label>
              <input className={field} value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
              <input className={field} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Accord" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">DTC Codes</label>
            <input className={field} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="P0300, P0171" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Complaint / Issue</label>
            <textarea
              className={field}
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Describe the problem the vehicle is having…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              className={field}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything already tried, scope readings, context…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Origin (optional)</label>
              <select className={field} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">Not specified</option>
                <option value="american">American</option>
                <option value="asian">Asian</option>
                <option value="european">European</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select className={field} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100">
          <Button variant="ghost" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download copy
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} isLoading={submitting}>
              Create Ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
