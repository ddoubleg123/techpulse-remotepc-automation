'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Users,
  Ticket,
  TrendingUp,
  Search,
  Bell,
  Settings,
  LogOut,
  BarChart3,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, Badge, Avatar, Button } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';

const stats = [
  { name: 'Total Users', value: '1,234', change: '+12%', icon: Users, color: 'bg-blue-500' },
  { name: 'Active Subscriptions', value: '892', change: '+8%', icon: UserCheck, color: 'bg-green-500' },
  { name: 'Open Tickets', value: '47', change: '-5%', icon: Ticket, color: 'bg-yellow-500' },
  { name: 'Monthly Revenue', value: '$312K', change: '+15%', icon: DollarSign, color: 'bg-purple-500' },
];

const recentTickets = [
  { id: 'TKT-1234', user: 'Mike Thompson', subject: 'Cannot upload PDF reports', status: 'open', priority: 'high', time: new Date(Date.now() - 15 * 60 * 1000) },
  { id: 'TKT-1233', user: 'Sarah Chen', subject: 'Synth not responding to queries', status: 'in_progress', priority: 'high', time: new Date(Date.now() - 45 * 60 * 1000) },
  { id: 'TKT-1232', user: 'Carlos Rodriguez', subject: 'Billing question about referral', status: 'waiting', priority: 'medium', time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'TKT-1231', user: 'Jennifer Lee', subject: 'Feature request: Audio export', status: 'resolved', priority: 'low', time: new Date(Date.now() - 5 * 60 * 60 * 1000) },
];

const recentUsers = [
  { name: 'David Park', email: 'david.park@example.com', plan: 'trial', joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { name: 'Lisa Martinez', email: 'lisa.m@autorepair.com', plan: 'active', joinedAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { name: 'Tom Wilson', email: 'twilson@mechanics.net', plan: 'trial', joinedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
];

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  waiting: Clock,
  resolved: CheckCircle,
};

const statusColors = {
  open: 'text-blue-500',
  in_progress: 'text-yellow-500',
  waiting: 'text-gray-500',
  resolved: 'text-green-500',
};

export default function AdminDashboard() {
  const [sidebarOpen] = useState(true);

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
            { icon: Activity, label: 'Analytics', href: '/admin/analytics' },
            { icon: Settings, label: 'Settings', href: '/admin/settings' },
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
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 w-full text-gray-400 hover:text-white">
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
              <p className="text-sm text-gray-500">Welcome back, Admin</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <Avatar name="Admin User" size="md" />
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
                      <p className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change} from last month
                      </p>
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
                  {recentTickets.map((ticket) => {
                    const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons];
                    return (
                      <div key={ticket.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <StatusIcon className={`w-5 h-5 mt-0.5 ${statusColors[ticket.status as keyof typeof statusColors]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{ticket.id}</span>
                              <Badge variant={ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'default'}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                            <p className="text-sm text-gray-500">
                              {ticket.user} - {formatRelativeTime(ticket.time)}
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
                  {recentUsers.map((user, i) => (
                    <div key={i} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.plan === 'active' ? 'success' : 'warning'}>
                            {user.plan}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(user.joinedAt)}
                          </p>
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
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Add User
                </Button>
                <Button variant="outline">
                  <Ticket className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
                <Button variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
