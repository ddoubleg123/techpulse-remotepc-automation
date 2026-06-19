'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Users, Ticket, LogOut, BarChart3 } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

const NAV = [
  { icon: BarChart3, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Ticket, label: 'Tickets', href: '/admin/tickets' },
];

/**
 * Persistent admin chrome (sidebar + header) shared by every /admin page, so
 * navigating between Dashboard/Users/Tickets keeps the menu visible.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const adminUser = useAuthStore((s) => s.user) as { name?: string; email?: string } | null;
  const signOut = useAuthStore((s) => s.signOut);
  const adminName = adminUser?.name || '';
  const adminEmail = adminUser?.email || '';

  const handleSignOut = () => {
    try {
      document.cookie = 'tp_at=; Path=/; Max-Age=0; SameSite=Lax; Secure';
      signOut();
    } catch { /* ignore */ }
    window.location.href = '/auth/login';
  };

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar — fixed so it stays put while content scrolls */}
      <aside className="w-64 shrink-0 bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold">TechPulse</span>
              <p className="text-xs text-gray-400">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.href) ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 w-full text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main column, offset by the fixed sidebar width */}
      <div className="flex-1 ml-64 min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">{adminEmail}</span>
              <Avatar name={adminName || adminEmail || 'Admin'} size="md" />
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
