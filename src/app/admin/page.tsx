'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Users,
  Ticket,
  TrendingUp,
  LogOut,
  BarChart3,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, Badge, Avatar, Button } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

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
  const [sidebarOpen] = useState(true);
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const adminUser = useAuthStore((s) => s.user) as { name?: string; email?: string } | null;
  const adminName = adminUser?.name || '';
  const adminEmail = adminUser?.email || '';

  const handleSignOut = () => {
    try {
      document.cookie = 'tp_at=; Path=/; Max-Age=0; SameSite=Lax; Secure';
      signOut();
    } catch { /* ignore */ }
    window.location.href = '/auth/login';
  };

  const [counts, setCounts] = useState<{ users: number | null; subs: number | null; openTickets: number | null; shops: number | null }>({
    users: null, subs: null, openTickets: null, shops: null,
  });
  const [recentTickets, setRecentTickets] = useState<AdminTicket[]>([]);
  const [recentUsers, setRecentUsers] = useState<AdminUserRow[]>([]);

  useEffect(() => {
    const t = useAuthStore.getState().token;
    if (!t || !SUPABASE_ANON_KEY) return;
    let cancelled = false;
    (async () => {
      const [users, subs, openTickets, shops, tickets, newUsers] = await Promise.all([
        fetchCount('users', t),
        fetchCount('subscriptions', t),
        fetchCount('support_tickets', t, 'status=eq.open'),
        fetchCount('shops', t),
        fetchRows<AdminTicket>('support_tickets?select=id,ticket_number,shop_name,complaint,status,priority,created_at&order=created_at.desc&limit=5', t),
        fetchRows<AdminUserRow>('users?select=id,email,name,role,created_at&order=created_at.desc&limit=5', t),
      ]);
      if (cancelled) return;
      setCounts({ users, subs, openTickets, shops });
      setRecentTickets(tickets);
      setRecentUsers(newUsers);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString());
  const stats = [
    { name: 'Total Users', value: fmt(counts.users), icon: Users, color: 'bg-blue-500' },
    { name: 'Subscriptions', value: fmt(counts.subs), icon: UserCheck, color: 'bg-green-500' },
    { name: 'Open Tickets', value: fmt(counts.openTickets), icon: Ticket, color: 'bg-yellow-500' },
    { name: 'Shops', value: fmt(counts.shops), icon: DollarSign, color: 'bg-purple-500' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-200`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="text-lg font-bold">TechPulse</span>
                <p className="text-xs text-gray-400">Admin Console</p>
              </div>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { icon: BarChart3, label: 'Dashboard', href: '/admin', active: true },
            { icon: Users, label: 'Users', href: '/admin/users' },
            { icon: Ticket, label: 'Tickets', href: '/admin/tickets' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                item.active ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 w-full text-gray-400 hover:text-white">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back{adminName ? `, ${adminName}` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">{adminEmail}</span>
              <Avatar name={adminName || adminEmail || 'Admin'} size="md" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat) => (
              <Card key={stat.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    <div key={u.id} className="p-4 hover:bg-gray-50">
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

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/tickets">
                  <Button>
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
        </main>
      </div>
    </div>
  );
}
