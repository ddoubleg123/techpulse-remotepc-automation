'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, MessageSquare, RefreshCw, FileText, Bell, Settings, Gift, LogOut, History, Shield, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useIsAdmin } from '@/lib/useIsAdmin';

const navItems = [
  { label: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { label: 'Diagnostic Chat', href: '/app/chat', icon: MessageSquare },
  { label: 'Auto History', href: '/app/history', icon: History },
  { label: 'Sync Data', href: '/app/sync', icon: RefreshCw },
  { label: 'Reports', href: '/app/reports', icon: FileText },
  // { label: 'Knowledge Base', href: '/app/knowledge', icon: BookOpen },
  // { label: 'Case Studies', href: '/app/cases', icon: Library },
  // { label: 'TSBs', href: '/app/tsbs', icon: FileSearch },
  // { label: 'Scope Patterns', href: '/app/scope-patterns', icon: Activity },
  { label: 'Notifications', href: '/app/notifications', icon: Bell },
  { label: 'Referrals', href: '/app/referrals', icon: Gift },
  { label: 'Settings', href: '/app/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const isAdmin = useIsAdmin();

  const handleSignOut = () => {
    // Clear auth state, then navigate to login. Explicit navigation ensures
    // sign-out works on every page regardless of redirect guards.
    signOut();
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
      }
    } catch {
      // ignore storage errors
    }
    router.replace('/auth/login');
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[var(--sidebar-bg)] border-r border-[var(--border)] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">TechPulse</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Admin Panel — visible only to admins. Opens the admin console in a
            separate window so it sits alongside the regular dashboard. */}
        {isAdmin && (
          <button
            onClick={() => window.open('/admin', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Open the admin panel in a new window"
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="flex-1">Admin Panel</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
          </button>
        )}
      </nav>

      {/* User card */}
      <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
        <Link
          href="/app/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--hover)] transition-colors w-full"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'My Account'}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email || ''}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-red-500 transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
