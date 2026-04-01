"use client";

import { useState } from "react";

export default function NewDiagnosticPage() {
  const [vin, setVin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      extractVinFromFile(uploadedFile);
    }
  };

  const extractVinFromFile = async (file: File) => {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract-vin`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.vin) {
        setVin(data.vin);
      }
    } catch (error) {
      console.error("VIN extraction failed:", error);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vin) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/diagnostic-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, documentFile: file?.name })
      });

      if (response.ok) {
        window.location.href = "/app/diagnostic/chat";
      }
    } catch (error) {
      console.error("Failed to start diagnostic:", error);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">New Diagnostic Report</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Vehicle Identification Number (VIN)
          </label>
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            maxLength={17}
            placeholder="Enter 17-character VIN"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Example: 1HGBH41JXMN109186
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Upload Document (Optional)
          </label>
          <input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.png,.jpeg"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white file:bg-slate-700 file:text-white file:border-0 file:rounded file:px-4 file:py-2 file:mr-4"
          />
          {extracting && (
            <p className="text-yellow-400 text-sm mt-2">Extracting VIN from document...</p>
          )}
          {file && !extracting && (
            <p className="text-green-400 text-sm mt-2">✓ {file.name} uploaded</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!vin}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-lg"
        >
          Start Diagnostic
        </button>
      </form>
    </div>
  );
}