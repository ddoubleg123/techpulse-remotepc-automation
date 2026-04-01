"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useReportsStore } from "@/stores/reportsStore";

const navigation = [
  { name: "Dashboard", href: "/app", icon: "🏠" },
  { name: "Sync", href: "/app/sync", icon: "🔄" },
  { name: "Diagnostic Chat", href: "/app/diagnostic/chat", icon: "💬" },
  { name: "New Report", href: "/app/diagnostic/new", icon: "📝" },
  { name: "Notifications", href: "/app/notifications", icon: "🔔", badge: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const { notifications } = useReportsStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">TechPulse</h1>
        <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const showBadge = item.badge && unreadCount > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </div>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User actions */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={signOut}
          className="w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}