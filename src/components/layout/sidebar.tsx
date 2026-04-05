'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LayoutDashboard, RefreshCw, MessageSquare, FileText, Bell, LogOut, Zap, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/app',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/app/chat',          label: 'Diagnostic Chat', icon: MessageSquare },
  { href: '/app/sync',          label: 'Sync Data',       icon: RefreshCw },
  { href: '/app/reports',       label: 'Reports',         icon: FileText },
  { href: '/app/notifications', label: 'Notifications',   icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  const handleSignOut = () => { signOut(); router.push('/auth/login'); };

  return (
    <aside style={{
      width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-sidebar)',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#00c3ff 0%,#0055ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,195,255,0.35)',
          }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>TechPulse</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(0,195,255,0.65)', letterSpacing: '0.06em' }}>AI DIAGNOSTICS</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div style={{ padding: '0 12px 16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: 'var(--bg-user)', border: '1px solid var(--border-user)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#00c3ff,#0055ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Technician'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>
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
              background: active ? 'var(--bg-nav-active)' : 'transparent',
              border: active ? '1px solid var(--border-nav-act)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, borderRadius: 2,
                  background: 'linear-gradient(180deg,#00c3ff,#0055ff)',
                }} />
              )}
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'rgba(255,255,255,0.07)',
                boxShadow: active ? '0 4px 10px rgba(0,195,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}>
                <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.45)'} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'color 0.15s' }}>
                {label}
              </span>
              {active && <ChevronRight size={13} color="rgba(0,195,255,0.5)" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 10px', flexShrink: 0 }}>
        {/* Synth status */}
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 8,
          background: 'var(--bg-synth)', border: '1px solid var(--border-synth)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', flex: 1 }}>Synth AI</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>Online</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>
            Diagnostic engine active
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
