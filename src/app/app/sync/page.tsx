"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function SyncPage() {
  const { devices } = useAuthStore();
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id || "");
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);

    // Simulate sync progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Data Sync</h1>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-4">RemotePC Sync</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Device
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:border-blue-500"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.status})
                </option>
              ))}
            </select>
          </div>

          {syncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Syncing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing || !selectedDevice}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-md font-medium"
          >
            {syncing ? "Syncing..." : "Start Sync"}
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Sync History</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-300">Last sync: 5 minutes ago</span>
            <span className="text-green-400">✓ Success</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-300">Previous sync: 2 hours ago</span>
            <span className="text-green-400">✓ Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}