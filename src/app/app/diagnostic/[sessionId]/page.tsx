"use client";

import { useParams } from "next/navigation";
import { useReportsStore } from "@/stores/reportsStore";

export default function DiagnosticReportPage() {
  const params = useParams();
  const { diagnosticSessions } = useReportsStore();
  
  const session = diagnosticSessions.find(s => s.id === params.sessionId);

  if (!session) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-white">Report Not Found</h1>
        <p className="text-slate-400 mt-2">The diagnostic report could not be found.</p>
      </div>
    );
  }

  const severityColors = {
    low: "text-green-400",
    medium: "text-yellow-400", 
    high: "text-red-400"
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Diagnostic Report</h1>
          <p className="text-slate-400 mt-1">VIN: {session.vin}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${severityColors[session.severity]}`}>
          {session.severity.toUpperCase()} Priority
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Vehicle Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Make:</span>
              <span className="text-white">{session.vehicleMake}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model:</span>
              <span className="text-white">{session.vehicleModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Year:</span>
              <span className="text-white">{session.year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">VIN:</span>
              <span className="text-white font-mono">{session.vin}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">DTC Codes</h2>
          <div className="space-y-2">
            {session.dtcCodes.map((code, index) => (
              <div key={index} className="bg-slate-700 px-3 py-2 rounded font-mono text-sm text-white">
                {code}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Findings</h2>
        <div className="space-y-3">
          {session.findings.map((finding, index) => (
            <div key={index} className="flex items-start space-x-3">
              <span className="text-blue-400 mt-1">•</span>
              <span className="text-slate-300">{finding}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">Feedback</h2>
        <textarea
          placeholder="Add your notes or feedback about this report..."
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          rows={4}
        />
        <button className="mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          Save Feedback
        </button>
      </div>
    </div>
  );
}