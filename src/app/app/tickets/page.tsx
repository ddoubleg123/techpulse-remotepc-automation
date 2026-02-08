'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

const tickets = [
  {
    id: 'TKT-001',
    subject: 'Engine diagnostic help needed - 2018 Honda Accord',
    description: 'Getting multiple codes including P0300, P0171, and P0174. Car runs rough at idle.',
    status: 'open' as const,
    priority: 'high' as const,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    messages: 0,
    lastActivity: 'Waiting for support',
  },
  {
    id: 'TKT-002',
    subject: 'Transmission code P0700 - Need diagnosis steps',
    description: 'Automatic transmission slipping between 2nd and 3rd gear. Check engine light on.',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    messages: 3,
    lastActivity: 'Synth replied',
  },
  {
    id: 'TKT-003',
    subject: 'ABS sensor replacement guide for 2015 Toyota Camry',
    description: 'Need step-by-step instructions for replacing front right ABS sensor.',
    status: 'resolved' as const,
    priority: 'low' as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    messages: 5,
    lastActivity: 'Resolved',
  },
  {
    id: 'TKT-004',
    subject: 'AC compressor clutch not engaging',
    description: '2019 Ford F-150, AC blows warm air. Compressor clutch does not engage.',
    status: 'waiting' as const,
    priority: 'medium' as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    messages: 2,
    lastActivity: 'Waiting for your reply',
  },
];

const statusConfig = {
  open: { label: 'Open', variant: 'info' as const, icon: AlertCircle },
  in_progress: { label: 'In Progress', variant: 'warning' as const, icon: Clock },
  waiting: { label: 'Waiting', variant: 'default' as const, icon: Clock },
  resolved: { label: 'Resolved', variant: 'success' as const, icon: CheckCircle },
  closed: { label: 'Closed', variant: 'default' as const, icon: CheckCircle },
};

const priorityConfig = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppLayout title="Tickets" subtitle="Track your support requests">
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
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open', count: 1, color: 'text-blue-600' },
            { label: 'In Progress', count: 1, color: 'text-yellow-600' },
            { label: 'Waiting', count: 1, color: 'text-gray-600' },
            { label: 'Resolved', count: 1, color: 'text-green-600' },
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
            <div className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status];
                return (
                  <a
                    key={ticket.id}
                    href={`/app/tickets/${ticket.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${status.variant === 'success' ? 'bg-green-100' : status.variant === 'warning' ? 'bg-yellow-100' : status.variant === 'info' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <status.icon className={`w-5 h-5 ${status.variant === 'success' ? 'text-green-600' : status.variant === 'warning' ? 'text-yellow-600' : status.variant === 'info' ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">{ticket.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[ticket.priority]}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                      <p className="text-sm text-gray-500 truncate">{ticket.description}</p>
                    </div>

                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.messages}
                        <span>•</span>
                        {formatRelativeTime(ticket.createdAt)}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
