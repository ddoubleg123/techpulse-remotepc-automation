'use client';

import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/app':          { title: 'Dashboard',      subtitle: 'Welcome back' },
  '/app/sync':     { title: 'Sync Data',       subtitle: 'Connect your diagnostic tools' },
  '/app/chat':     { title: 'Diagnostic Chat', subtitle: 'AI-powered vehicle analysis' },
  '/app/reports':  { title: 'Reports',         subtitle: 'View diagnostic history' },
  '/app/billing':  { title: 'Billing',         subtitle: 'Manage your subscription' },
  '/app/profile':  { title: 'Profile',         subtitle: 'Your account settings' },
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const page = pageTitles[pathname] || { title: 'TechPulse', subtitle: '' };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header
      className="flex items-center justify-between px-8 py-4 flex-shrink-0"
      style={{
        background: 'rgba(10,15,30,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left: page title */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium" style={{ color: 'rgba(0,212,255,0.7)' }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-xs text-white/30">{page.subtitle}</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{page.title}</h1>
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-white placeholder-white/25 outline-none w-40"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Bell className="w-4 h-4 text-white/60" />
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)', fontSize: '9px' }}
          >2</span>
        </button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)' }}
        >
          {(user?.name || user?.email || 'U')[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Header;
