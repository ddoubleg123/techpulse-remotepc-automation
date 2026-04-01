"use client";

import { useReportsStore } from "@/stores/reportsStore";

export default function NotificationsPage() {
  const { notifications, markAsRead } = useReportsStore();

  const typeColors = {
    info: "bg-blue-500",
    success: "bg-green-500", 
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Notifications</h1>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-slate-800 p-4 rounded-lg border border-slate-700 ${
              !notification.read ? "border-l-4 border-l-blue-500" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${typeColors[notification.type]}`} />
                <div className="flex-1">
                  <h3 className="text-white font-medium">{notification.title}</h3>
                  <p className="text-slate-400 mt-1">{notification.message}</p>
                  <span className="text-xs text-slate-500">{notification.timestamp}</span>
                </div>
              </div>
              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}