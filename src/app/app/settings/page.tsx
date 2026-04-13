'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, CreditCard, Bell, FileText, Shield, HelpCircle, ChevronRight, LogOut, Camera } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';

const menuSections = [
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile',           icon: User,       href: '/app/profile' },
      { label: 'Billing & Subscription', icon: CreditCard, href: '/app/billing' },
      { label: 'Notifications',          icon: Bell,       href: '/app/notifications' },
    ],
  },
  {
    title: 'Activity',
    items: [{ label: 'My Reports', icon: FileText, href: '/app/reports' }],
  },
  {
    title: 'More',
    items: [
      { label: 'Privacy & Security', icon: Shield,     href: '/app/settings/privacy' },
      { label: 'Help & Support',     icon: HelpCircle, href: '/app/settings/help' },
    ],
  },
];

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = () => { signOut(); router.push('/auth/login'); };

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">

        {/* Profile card */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <span className="text-white text-xl font-bold">{user?.name?.slice(0, 2).toUpperCase() || 'ME'}</span>
              </div>
              <Link href="/app/profile" className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border-2 border-[var(--border)] rounded-full flex items-center justify-center hover:bg-gray-50">
                <Camera className="w-3 h-3 text-gray-600" />
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{user?.name || 'TechPulse User'}</h2>
              <p className="text-sm text-[var(--text-secondary)] truncate">{user?.email || ''}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-[var(--accent)] text-white rounded-full">Mechanic</span>
            </div>
            <Link href="/app/profile" className="text-sm font-medium text-[var(--accent)] hover:underline">Edit</Link>
          </div>
        </div>

        {/* Menu sections */}
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1 mb-2">{section.title}</h3>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
              {section.items.map(item => (
                <Link key={item.href} href={item.href} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--hover)] transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-[var(--hover)] flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {!showSignOutConfirm ? (
            <button onClick={() => setShowSignOutConfirm(true)} className="flex items-center gap-4 px-5 py-4 w-full hover:bg-red-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-red-500">Sign Out</span>
            </button>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">Sign out of TechPulse?</p>
              <div className="flex gap-3">
                <button onClick={handleSignOut} className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors">Sign Out</button>
                <button onClick={() => setShowSignOutConfirm(false)} className="flex-1 py-2 bg-[var(--hover)] text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)] pb-4">TechPulse v2.0</p>
      </div>
    </AppLayout>
  );
}
