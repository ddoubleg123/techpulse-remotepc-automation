'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  RefreshCw,
  MessageSquare,
  FileText,
  Bell,
  LogOut,
  Zap,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/app',        label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/app/sync',   label: 'Sync Data',       icon: RefreshCw },
  { href: '/app/chat',   label: 'Diagnostic Chat', icon: MessageSquare },
  { href: '/app/reports',label: 'Reports',         icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside
      style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1526 60%, #0a1a2e 100%)' }}
      className="w-64 flex-shrink-0 flex flex-col h-screen border-r border-white/5"
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)' }}
          >
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-wide">TechPulse</span>
            <div className="text-xs text-blue-400/70 font-medium -mt-0.5">AI Diagnostics</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="mx-4 mb-6 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)' }}
          >
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name || 'Technician'}</p>
            <p className="text-white/40 text-xs truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-6 mb-2">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>Menu</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/app' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
              style={active ? {
                background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,102,255,0.15) 100%)',
                border: '1px solid rgba(0,212,255,0.2)',
              } : {
                border: '1px solid transparent',
              }}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #00d4ff, #0066ff)' }} />
              )}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={active ? {
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <Icon className="w-4 h-4" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)' }} />
              </div>
              <span
                className="text-sm font-medium transition-colors duration-200 flex-1"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)' }}
              >
                {label}
              </span>
              {active && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'rgba(0,212,255,0.6)' }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 mt-4">
        <div className="rounded-2xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/50">Synth AI</span>
            <span className="ml-auto text-xs text-emerald-400 font-semibold">Online</span>
          </div>
          <p className="text-xs text-white/30 leading-relaxed">AI diagnostic engine active and ready</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm font-medium text-white/40 group-hover:text-red-400 transition-colors">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
