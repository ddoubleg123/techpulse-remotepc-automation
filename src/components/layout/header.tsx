'use client';

import { useAuthStore } from '@/stores/authStore';
import { Bell, Sun, Moon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/app':               'Dashboard',
  '/app/chat':          'Diagnostic Chat',
  '/app/sync':          'Sync Data',
  '/app/reports':       'Reports',
  '/app/scope-patterns':'Scope Patterns',
  '/app/notifications': 'Notifications',
};

export default function Header() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('tp-theme') as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tp-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const title = PAGE_TITLES[pathname] ?? 'TechPulse';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <header style={{
      height: 64, flexShrink: 0, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      background: 'var(--bg-header)', borderBottom: '1px solid var(--border-header)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
          {greeting}{firstName ? ', ' + firstName : ''} &nbsp;&nbsp; Welcome back
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{title}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{ width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {theme === 'dark' ? <Sun size={16} color='var(--text-2)' /> : <Moon size={16} color='var(--text-2)' />}
        </button>

        {/* Notifications */}
        <button style={{ position:'relative', width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bell size={16} color='var(--text-2)' />
          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#00c3ff', border:'2px solid var(--bg-header)' }} />
        </button>
      </div>
    </header>
  );
}
