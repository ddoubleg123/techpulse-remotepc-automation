'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Ticket,
  FileText,
  Users,
  User,
  CreditCard,
  LayoutDashboard,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Synth Chat', href: '/app/chat', icon: Zap },
  { name: 'Tickets', href: '/app/tickets', icon: Ticket },
  { name: 'Reports', href: '/app/reports', icon: FileText },
  { name: 'Community', href: '/app/community', icon: Users },
  { name: 'Profile', href: '/app/profile', icon: User },
  { name: 'Billing', href: '/app/billing', icon: CreditCard },
];

const bottomNavigation = [
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold">TechPulse</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/app' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <Avatar name="Demo User" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Demo User</p>
            <p className="text-xs text-gray-400 truncate">demo@techpulse.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
