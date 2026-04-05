'use client';

import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const titles: Record<string, string> = {
  '/app': 'Dashboard', '/app/sync': 'Sync Data',
  '/app/chat': 'Diagnostic Chat', '/app/reports': 'Reports',
  '/app/billing': 'Billing', '/app/profile': 'Profile',
  '/app/notifications': 'Notifications',
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.getAttribute('data-theme') !== 'light');
  }, []);

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tp-theme', next);
    setDark(!dark);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const title = titles[pathname] ?? 'TechPulse';
  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', height: 64, flexShrink: 0,
      background: 'var(--bg-header)',
      borderBottom: '1px solid var(--border-header)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Left */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-3)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Welcome back</span>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0, lineHeight: 1 }}>{title}</h1>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 12,
          background: 'var(--bg-input)', border: '1px solid var(--border-input)',
        }}>
          <Search size={14} color="var(--text-3)" />
          <input
            placeholder="Search..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-1)', width: 140,
            }}
          />
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button onClick={toggleTheme} style={{
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-input)',
            background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {dark
              ? <Sun size={16} color="#f59e0b" />
              : <Moon size={16} color="#6366f1" />
            }
          </button>
        )}

        {/* Bell */}
        <button style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10,
          border: '1px solid var(--border-input)', background: 'var(--bg-input)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Bell size={16} color="var(--text-2)" />
          <span style={{
            position: 'absolute', top: -4, right: -4, width: 18, height: 18,
            borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>2</span>
        </button>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff',
          boxShadow: '0 4px 12px rgba(0,195,255,0.3)',
        }}>{initial}</div>
      </div>
    </header>
  );
}

export default Header;
