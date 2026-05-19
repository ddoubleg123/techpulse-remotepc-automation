"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";

type ReportRow = {
  id: string;
  filename?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  session_id?: string | null;
  created_at: string;
};

const SYNTH_API = "https://techpulse-api.onrender.com";
const SYNTH_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || "";
const READ_STORAGE_KEY = "techpulse-notifications-read";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function vehicleLabel(r: ReportRow): string {
  const parts = [r.vehicle_year, r.vehicle_make, r.vehicle_model].filter(Boolean);
  return parts.length ? parts.join(" ") : (r.filename || "Diagnostic report");
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  const fetchReports = useCallback(async () => {
    if (!SYNTH_TOKEN) {
      setLoading(false);
      setError("Synth API token not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (user?.email) params.set("email", user.email);
      const qs = params.toString();
      const url = qs ? `${SYNTH_API}/api/reports?${qs}` : `${SYNTH_API}/api/reports`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${SYNTH_TOKEN}` },
      });
      if (!res.ok) throw new Error(`Couldn't load notifications (HTTP ${res.status}).`);
      const data = await res.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    for (const r of reports) next.add(r.id);
    saveReadIds(next);
    setReadIds(next);
  };

  const hasUnread = reports.some(r => !readIds.has(r.id));

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <button
            onClick={markAllAsRead}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Mark all as read
          </button>
        </div>
      )}

      {loading && (
        <div className="text-slate-400 text-sm p-4">Loading notifications...</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={fetchReports}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="p-8 rounded-lg bg-slate-800 border border-slate-700 text-center">
          <p className="text-slate-300 font-medium mb-1">No notifications yet</p>
          <p className="text-slate-500 text-sm">
            New diagnostic reports will appear here.
          </p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((r) => {
            const isRead = readIds.has(r.id);
            return (
              <div
                key={r.id}
                className={`p-4 rounded-lg border ${
                  isRead
                    ? "bg-slate-900/60 border-slate-800 border-l-4 border-l-slate-600"
                    : "bg-slate-800 border-slate-700 border-l-4 border-l-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className={`font-medium ${isRead ? "text-slate-400" : "text-white"}`}>
                      New diagnostic report
                    </h3>
                    <p className={`mt-1 text-sm ${isRead ? "text-slate-500" : "text-slate-300"}`}>
                      {vehicleLabel(r)}
                    </p>
                    <span className="text-xs text-slate-500 mt-2 inline-block">
                      {formatRelative(r.created_at)}
                    </span>
                  </div>
                  {!isRead && (
                    <button
                      onClick={() => markAsRead(r.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm shrink-0"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
