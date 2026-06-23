'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Ticket,
  TrendingUp,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, Badge, Avatar, Button } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import UserDetailModal from '@/components/admin/UserDetailModal';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Count via PostgREST: HEAD with Prefer count=exact returns Content-Range "*/N".
async function fetchCount(table: string, token: string, filter = ''): Promise<number | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id${filter ? '&' + filter : ''}`, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, Prefer: 'count=exact' },
    });
    const cr = res.headers.get('content-range') || '';
    const n = cr.split('/')[1];
    return n ? parseInt(n, 10) : null;
  } catch {
    return null;
  }
}

async function fetchRows<T>(path: string, token: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

interface LoginActivityRow {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  last_active: string | null;
  provider: string | null;
  signed_up_at: string | null;
  active_sessions: number | null;
  logged_in_today: boolean;
  active_today: boolean;
}

// Admin-only login activity from auth.users (via SECURITY DEFINER RPC).
async function fetchLoginActivity(token: string): Promise<LoginActivityRow[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_login_activity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

interface AdminTicket {
  id: string;
  ticket_number: string | null;
  shop_name: string | null;
  complaint: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
}
interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string | null;
}

const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle,
  active: Clock,
  closed: CheckCircle,
};

const statusColors: Record<string, string> = {
  open: 'text-blue-500',
  active: 'text-yellow-500',
  closed: 'text-green-500',
};

export default function AdminDashboard() {
  const token = useAuthStore((s) => s.token);

  const [counts, setCounts] = useState<{ users: number | null; subs: number | null; openTickets: number | null; shops: number | null }>({
    users: null, subs: null, openTickets: null, shops: null,
  });
  const [recentTickets, setRecentTickets] = useState<AdminTicket[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeUsers30d, setActiveUsers30d] = useState<number | null>(null);
  const [recentLogins, setRecentLogins] = useState<LoginActivityRow[]>([]);

  useEffect(() => {
    const t = useAuthStore.getState().token;
    if (!t || !SUPABASE_ANON_KEY) return;
    let cancelled = false;
    (async () => {
      const [dashCounts, tickets, newUsers, loginActivity] = await Promise.all([
        (async () => {
          try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_dashboard_counts`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
              body: '{}',
            });
            if (!r.ok) return [];
            const j = await r.json();
            return Array.isArray(j) ? j : [];
          } catch { return []; }
        })(),
        fetchRows<AdminTicket>('support_tickets?select=id,ticket_number,shop_name,complaint,status,priority,created_at&order=created_at.desc&limit=5', t),
        fetchRows<AdminUserRow>('users?select=id,email,name,role,created_at&order=created_at.desc&limit=5', t),
        fetchLoginActivity(t),
      ]);
      if (cancelled) return;
      const dc = (Array.isArray(dashCounts) && dashCounts[0] ? dashCounts[0] : { users_total: 0, shops_total: 0, paying_customers: 0, open_tickets: 0 }) as { users_total: number; shops_total: number; paying_customers: number; open_tickets: number };
      setCounts({ users: dc.users_total, subs: dc.paying_customers, openTickets: dc.open_tickets, shops: dc.shops_total });
      setRecentTickets(tickets);
      setRecentUsers(newUsers);
      // "Active Users" = signed in (or session-active) within the last 30 days.
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setActiveUsers30d(
        loginActivity.filter((r) => {
          const t = r.last_active || r.last_sign_in_at;
          return t && new Date(t).getTime() >= cutoff;
        }).length
      );
      // Recent activity ordered by most recent of (last_active, last_sign_in_at).
      setRecentLogins(
        loginActivity
          .filter((r) => r.last_active || r.last_sign_in_at)
          .slice(0, 8)
      );
    })();
    return () => { cancelled = true; };
  }, [token]);

  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString());
  const stats = [
    { name: 'Total Users', value: fmt(counts.users), icon: Users, color: 'bg-blue-500', href: '/admin/users', sub: 'all accounts' },
    { name: 'Active Users', value: fmt(activeUsers30d), icon: Activity, color: 'bg-teal-500', href: '/admin/active-users?days=30', sub: 'last 30 days' },
    { name: 'Paying Customers', value: fmt(counts.subs), icon: UserCheck, color: 'bg-green-500', href: '/admin/subscriptions', sub: 'active subscriptions' },
    { name: 'Open Tickets', value: fmt(counts.openTickets), icon: Ticket, color: 'bg-yellow-500', href: '/admin/tickets', sub: 'support queue' },
    { name: 'Shops', value: fmt(counts.shops), icon: DollarSign, color: 'bg-purple-500', href: '/admin/shops', sub: 'all shops' },
  ];

  return (
    <main className="p-6">
      {/* Quick Actions — kept at the top so they're always visible */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/diagnostics">
              <Button>
                <Activity className="w-4 h-4 mr-2" />
                Customer Diagnostics
              </Button>
            </Link>
            <Link href="/admin/tickets">
              <Button variant="outline">
                <Ticket className="w-4 h-4 mr-2" />
                Manage Tickets
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                View Users
              </Button>
            </Link>
            <Link href="/app/tickets">
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6 items-stretch">
        {stats.map((stat) => {
          const inner = (
            <Card className={`h-full ${stat.href ? 'cursor-pointer transition-shadow hover:shadow-md hover:border-blue-300' : ''}`}>
              <CardContent className="p-6 h-full">
                <div className="flex items-start justify-between h-full">
                  <div className="flex flex-col">
                    <p className="text-sm text-gray-500">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{stat.sub}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color} text-white shrink-0`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          return stat.href
            ? <Link key={stat.name} href={stat.href} className="block h-full">{inner}</Link>
            : <div key={stat.name} className="h-full">{inner}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            <Link href="/admin/tickets" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentTickets.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No tickets yet.</div>
              )}
              {recentTickets.map((ticket) => {
                const st = (ticket.status || 'open').toLowerCase();
                const StatusIcon = statusIcons[st] || AlertCircle;
                const pr = (ticket.priority || 'normal').toLowerCase();
                return (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`w-5 h-5 mt-0.5 ${statusColors[st] || 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{ticket.ticket_number || ticket.id.slice(0, 8)}</span>
                          <Badge variant={pr === 'urgent' ? 'error' : pr === 'high' ? 'warning' : 'default'}>
                            {pr}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900 truncate">{ticket.complaint || 'No description'}</p>
                        <p className="text-sm text-gray-500">
                          {(ticket.shop_name || 'Unknown shop')}{ticket.created_at ? ` - ${formatRelativeTime(new Date(ticket.created_at))}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">New Users</h3>
            <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentUsers.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No users yet.</div>
              )}
              {recentUsers.map((u) => (
                <div key={u.id} onClick={() => setSelectedUserId(u.id)} className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name || u.email || 'User'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{u.name || (u.email ? u.email.split('@')[0] : 'User')}</p>
                      <p className="text-sm text-gray-500 truncate">{u.email || '—'}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.role === 'admin' ? 'success' : 'default'}>
                        {u.role || 'user'}
                      </Badge>
                      {u.created_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(new Date(u.created_at))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity — sourced from auth.users + auth.sessions. Shows the
          most recently active users (login or live session), not just fresh logins. */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <span className="text-xs text-gray-400">last login &amp; last active</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {recentLogins.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No activity yet.</div>
            )}
            {recentLogins.map((r) => {
              const lastActive = r.last_active || r.last_sign_in_at;
              return (
                <div key={r.id} className="p-4 hover:bg-gray-50 flex items-center gap-3">
                  <Avatar name={r.email || 'User'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.email || '—'}</p>
                    <p className="text-sm text-gray-500">
                      {r.provider === 'google' ? 'Google' : r.provider === 'email' ? 'Email OTP' : (r.provider || 'unknown')}
                      {r.last_sign_in_at ? ` · last login ${formatRelativeTime(new Date(r.last_sign_in_at))}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.active_today && <Badge variant="success">Active today</Badge>}
                    {lastActive && (
                      <p className="text-xs text-gray-400 mt-1">
                        active {formatRelativeTime(new Date(lastActive))}
                      </p>
                    )}
                    {(r.active_sessions ?? 0) > 0 && (
                      <p className="text-[10px] text-gray-400">{r.active_sessions} active session{r.active_sessions === 1 ? '' : 's'}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
    </main>
  );
}
