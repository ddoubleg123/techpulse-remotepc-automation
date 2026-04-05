'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, RefreshCw, FileText, ArrowRight,
  Activity, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

const quickActions = [
  {
    href: '/app/chat',
    icon: MessageSquare,
    title: 'Chat with Synth',
    desc: 'Diagnose a vehicle with AI',
    gradient: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
    glow: 'rgba(0,212,255,0.15)',
  },
  {
    href: '/app/sync',
    icon: RefreshCw,
    title: 'Sync Data',
    desc: 'Connect diagnostic tools',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    glow: 'rgba(168,85,247,0.15)',
  },
  {
    href: '/app/reports',
    icon: FileText,
    title: 'View Reports',
    desc: 'Browse diagnostic history',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    glow: 'rgba(16,185,129,0.15)',
  },
];

const recentActivity = [
  { icon: CheckCircle,   color: '#10b981', title: 'Sync Complete',  desc: 'Successfully synced with 2 devices',             time: '5 min ago' },
  { icon: FileText,      color: '#00d4ff', title: 'New Report',     desc: 'Diagnostic complete — VIN: 1HGBH41JXMN109186',   time: '1 hr ago'  },
  { icon: AlertTriangle, color: '#f59e0b', title: 'DTC Detected',   desc: 'P0420 flagged on 2018 Honda Accord',             time: '3 hr ago'  },
  { icon: Activity,      color: '#a855f7', title: 'AI Analysis',    desc: 'Synth completed root-cause analysis',            time: '5 hr ago'  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div
      className="flex-1 overflow-y-auto p-8"
      style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1526 100%)' }}
    >
      {/* Hero banner */}
      <div
        className="rounded-3xl p-8 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d2040 0%, #0a1a35 50%, #081428 100%)', border: '1px solid rgba(0,212,255,0.12)' }}
      >
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Synth AI Online</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to diagnose</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>AI engine active · 6,000+ diagnostic cases · 80–85% accuracy</p>
          </div>
          <Link href="/app/chat" className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)' }}>
            Start Diagnosis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Devices"    value="1" color="#00d4ff" />
        <StatCard label="Reports Generated" value="1" color="#a855f7" />
        <StatCard label="Notifications"     value="2" color="#f59e0b" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map(({ href, icon: Icon, title, desc, gradient, glow }) => (
            <Link key={href} href={href} className="group rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: gradient, boxShadow: `0 8px 24px ${glow}` }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
              <div className="flex items-center gap-1 mt-auto">
                <span className="text-xs font-medium" style={{ color: 'rgba(0,212,255,0.7)' }}>Open</span>
                <ArrowRight className="w-3 h-3" style={{ color: 'rgba(0,212,255,0.7)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Recent Activity</h3>
          <Link href="/app/reports" className="text-xs font-medium" style={{ color: 'rgba(0,212,255,0.7)' }}>View all</Link>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {recentActivity.map(({ icon: Icon, color, title, desc, time }, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
