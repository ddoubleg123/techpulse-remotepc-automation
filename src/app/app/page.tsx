"use client";

import { useAuthStore } from "@/stores/authStore";
import { useReportsStore } from "@/stores/reportsStore";
import Link from "next/link";

export default function DashboardPage() {
  const { user, devices } = useAuthStore();
  const { notifications, diagnosticSessions } = useReportsStore();

  const stats = [
    { label: "Active Devices", value: devices.length, color: "text-green-400" },
    { label: "Reports", value: diagnosticSessions.length, color: "text-blue-400" },
    { label: "Notifications", value: notifications.filter(n => !n.read).length, color: "text-yellow-400" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <Link
          href="/app/diagnostic/new"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          New Vehicle Report
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="text-2xl font-bold mb-2">
              <span className={stat.color}>{stat.value}</span>
            </div>
            <div className="text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/app/diagnostic/chat"
          className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 transition-colors"
        >
          <div className="text-lg font-semibold text-white mb-2">💬 Chat with Synth</div>
          <div className="text-slate-400">Get AI assistance for diagnostic questions</div>
        </Link>

        <Link
          href="/app/sync"
          className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 transition-colors"
        >
          <div className="text-lg font-semibold text-white mb-2">🔄 Sync Data</div>
          <div className="text-slate-400">Sync with RemotePC and update vehicle data</div>
        </Link>

        <Link
          href="/app/diagnostic/new"
          className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 transition-colors"
        >
          <div className="text-lg font-semibold text-white mb-2">📊 Diagnostic Reports</div>
          <div className="text-slate-400">View and manage diagnostic reports</div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        
        {notifications.slice(0, 3).map((notification) => (
          <div key={notification.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-medium">{notification.title}</div>
                <div className="text-slate-400 text-sm mt-1">{notification.message}</div>
              </div>
              <div className="text-xs text-slate-500">{notification.timestamp}</div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}