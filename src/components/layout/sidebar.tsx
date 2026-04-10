'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LayoutDashboard, RefreshCw, MessageSquare, FileText, Bell, LogOut, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/app',               label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/app/chat',          label: 'Diagnostic Chat', icon: MessageSquare },
  { href: '/app/sync',          label: 'Sync Data',       icon: RefreshCw },
  { href: '/app/reports',       label: 'Reports',         icon: FileText },
  { href: '/app/notifications', label: 'Notifications',   icon: Bell },
];

function TechPulseLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #00c3ff 0%, #0055ff 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,195,255,0.4)', padding: 4,
      }}>
        <svg viewBox="0 0 48 28" fill="none" style={{ width: '100%', height: '100%' }}>
          <polyline points="0,14 10,14 14,4 17,24 20,14 24,2 27,22 30,14 34,14 37,8 39,20 41,14 48,14"
            stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>TechPulse</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,195,255,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>AI Diagnostics</div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Technician';
  const displayEmail = user?.email || '';

  const handleSignOut = () => { signOut(); router.push('/auth/login'); };

  return (
    <aside style={{
      width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-sidebar)',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', flexShrink: 0 }}>
        <TechPulseLogo />
      </div>

      {/* Section label */}
      <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
          Navigation
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/app' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 10, marginBottom: 2,
              textDecoration: 'none', position: 'relative',
              // Active: subtle white/gray tint — avoids competing with the blue logo
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              {/* Left accent bar — white instead of blue */}
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, borderRadius: 2,
                  background: '#fff',
                }} />
              )}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                // Active icon: white background
                background: active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}>
                <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.45)'} />
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, flex: 1, color: active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'color 0.15s' }}>
                {label}
              </span>
              {active && <ChevronRight size={13} color="rgba(255,255,255,0.4)" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: Synth status + user card + sign out */}
      <div style={{ padding: '10px 10px 12px', flexShrink: 0 }}>
        {/* Synth status */}
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 8,
          background: 'var(--bg-synth)', border: '1px solid var(--border-synth)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', flex: 1 }}>Synth AI</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>Online</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>Diagnostic engine active</div>
        </div>

        {/* User card — above sign out */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12, marginBottom: 8,
          background: 'var(--bg-user)', border: '1px solid var(--border-user)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayEmail}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
          transition: 'all 0.15s',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LogOut size={14} color="#f87171" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(248,113,113,0.7)' }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
