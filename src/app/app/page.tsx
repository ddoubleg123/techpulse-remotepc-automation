'use client';

import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/ui';
import {
  MessageSquare,
  Ticket,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';

const stats = [
  { name: 'Open Tickets', value: '3', change: '+1 today', icon: Ticket, color: 'text-blue-600 bg-blue-100' },
  { name: 'Chat Sessions', value: '24', change: 'This month', icon: MessageSquare, color: 'text-purple-600 bg-purple-100' },
  { name: 'Reports Uploaded', value: '12', change: 'Total', icon: FileText, color: 'text-green-600 bg-green-100' },
  { name: 'Days in Trial', value: '23', change: '7 days left', icon: Clock, color: 'text-orange-600 bg-orange-100' },
];

const recentTickets = [
  { id: 'TKT-001', subject: 'Engine diagnostic help needed', status: 'open', time: '2 hours ago' },
  { id: 'TKT-002', subject: 'Transmission code P0700', status: 'in_progress', time: '1 day ago' },
  { id: 'TKT-003', subject: 'ABS sensor replacement guide', status: 'resolved', time: '3 days ago' },
];

const quickActions = [
  { name: 'Ask Synth', description: 'Get instant AI-powered help', icon: Zap, href: '/app/chat', color: 'bg-blue-500' },
  { name: 'Create Ticket', description: 'Submit a support request', icon: Ticket, href: '/app/tickets/new', color: 'bg-purple-500' },
  { name: 'Upload Report', description: 'Add diagnostic reports', icon: FileText, href: '/app/reports', color: 'bg-green-500' },
];

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <a
                  key={action.name}
                  href={action.href}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2.5 rounded-lg ${action.color} text-white`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{action.name}</p>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg">
                        {ticket.status === 'resolved' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : ticket.status === 'in_progress' ? (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">{ticket.id} • {ticket.time}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        ticket.status === 'resolved'
                          ? 'success'
                          : ticket.status === 'in_progress'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trial Banner */}
      <Card className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">7 days left in your free trial</h3>
              <p className="text-blue-100 mt-1">
                Add a payment method to continue using TechPulse after your trial ends.
              </p>
            </div>
            <Button variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Add payment method
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
