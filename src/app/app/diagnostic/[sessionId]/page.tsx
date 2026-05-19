"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

type ReportDetail = {
  id: string;
  filename?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  session_id?: string | null;
  created_at?: string;
  content_base64?: string | null;
  email?: string | null;
};

const SYNTH_API = "https://techpulse-api.onrender.com";
const SYNTH_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || "";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function vehicleSummary(r: ReportDetail | null): string {
  if (!r) return "";
  const parts = [r.vehicle_year, r.vehicle_make, r.vehicle_model].filter(Boolean) as string[];
  return parts.length ? parts.join(" ") : "Unknown vehicle";
}

export default function DiagnosticReportPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || "";
  const { user } = useAuthStore();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionId) return;
      if (!SYNTH_TOKEN) {
        if (!cancelled) {
          setLoading(false);
          setError("Synth API token not configured");
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (user?.email) qs.set("email", user.email);
        const qstr = qs.toString();
        const url = `${SYNTH_API}/api/reports/${encodeURIComponent(sessionId)}${qstr ? `?${qstr}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${SYNTH_TOKEN}` },
        });
        if (res.status === 404) {
          if (!cancelled) {
            setReport(null);
            setError(null);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) throw new Error(`Couldn't load report (HTTP ${res.status}).`);
        const data = await res.json();
        if (!cancelled) {
          setReport(data && data.report ? data.report : null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId, user?.email]);

  function handleDownloadPdf() {
    if (!report || !report.content_base64) return;
    try {
      const byteString = atob(report.content_base64);
      const buf = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) buf[i] = byteString.charCodeAt(i);
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.filename || "TechPulse_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Failed to prepare PDF for download.");
    }
  }

  if (loading) {
    return <div className="text-slate-400 py-8">Loading report...</div>;
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-slate-800 border border-slate-700">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white">Report Not Found</h1>
        <p className="text-slate-400 mt-2">The diagnostic report could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Diagnostic Report</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Session: <span className="font-mono">{report.session_id || "—"}</span>
          </p>
        </div>
        {report.content_base64 && (
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg shrink-0"
          >
            Download PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Vehicle Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Make:</span>
              <span className="text-white">{report.vehicle_make || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model:</span>
              <span className="text-white">{report.vehicle_model || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Year:</span>
              <span className="text-white">{report.vehicle_year || "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Report Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400 shrink-0">Filename:</span>
              <span className="text-white font-mono truncate">{report.filename || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created:</span>
              <span className="text-white">{formatDate(report.created_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400 shrink-0">Session ID:</span>
              <span className="text-white font-mono text-xs truncate">{report.session_id || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-2">Diagnostic Detail</h2>
        <p className="text-slate-400 text-sm">
          {report.content_base64
            ? `The full diagnostic report PDF is available — click "Download PDF" above to save it. (${vehicleSummary(report)})`
            : "The full diagnostic content is not yet available in this view."}
        </p>
      </div>
    </div>
  );
}
