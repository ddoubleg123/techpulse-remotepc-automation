'use client';
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { isDemoUser } from '@/lib/demoUsers';
import { assertAcceptableScannerPdf, getPdfSizeViolationMessage, readPdfAsRawBase64 } from '@/lib/scannerPdf';
import { getOrCreateSessionUnid } from '@/lib/unid';
import { useSearchParams } from 'next/navigation';
import { loadSession } from '@/lib/sessionHistory';
import { isValidPdfBase64 } from '@/lib/upload-classifier';
import { track } from '@/lib/track';
import { ConfirmFixModal } from '@/components/billing/ConfirmFixModal';
import { UnconfirmFixModal } from '@/components/billing/UnconfirmFixModal';
import {
  Send, Zap, Plus, X, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown,
  RotateCcw, Upload, Search, Car, Info
} from 'lucide-react';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';

type Step = 'vin' | 'codes' | 'chat' | 'report' | 'feedback';
interface Vehicle { year: string; make: string; model: string; engine: string; mileage: string; vin: string; }
interface DtcCode { code: string; description: string; }

// === Demo mode ===
// When daniel@techpulse.dev logs in, the diagnostic flow auto-populates the
// 2014 BMW X3 Valvetronic case from the pitch deck (page 4). Real flow, real
// Synth — only the inputs are preset. Also pre-warms the Synth API immediately
// on login so the chat step has no Render cold-start delay.
const DEMO_USER_EMAILS = ['daniel@techpulse.dev', 'candice@techpulse.dev', 'sidd@techpulse.dev'];
const DEMO_VEHICLE: Vehicle = {
  year: '2014',
  make: 'BMW',
  model: 'X3 (F25) xDrive35i',
  engine: '3.0L N55B30A Turbocharged I6',
  mileage: '',
  vin: '5UXWX9C57E0D49888',
};
const DEMO_CODES: DtcCode[] = [
  { code: 'P134F-01', description: 'Valvetronic Eccentric Shaft Position Deviation' },
];
const DEMO_SYMPTOMS = 'No throttle response, pedal to floor, vehicle will not exceed 10 MPH. Struggled to climb hill. Valvetronic relearn attempted - failed.';
// Pre-built sample report so demo users can view a report instantly, independent of the live Synth response.
const DEMO_REPORT_PDF_B64 = 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9TeW1ib2wgL05hbWUgL0YzIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNSAwIG9iago8PAovQ29udGVudHMgOSAwIFIgL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXSAvUGFyZW50IDggMCBSIC9SZXNvdXJjZXMgPDwKL0ZvbnQgMSAwIFIgL1Byb2NTZXQgWyAvUERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJIF0KPj4gL1JvdGF0ZSAwIC9UcmFucyA8PAoKPj4gCiAgL1R5cGUgL1BhZ2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL1BhZ2VNb2RlIC9Vc2VOb25lIC9QYWdlcyA4IDAgUiAvVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKNyAwIG9iago8PAovQXV0aG9yIChcKGFub255bW91c1wpKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwNjAyMTUwNDUwKzAwJzAwJykgL0NyZWF0b3IgKFwodW5zcGVjaWZpZWRcKSkgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYwNjAyMTUwNDUwKzAwJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKFwodW5zcGVjaWZpZWRcKSkgL1RpdGxlIChcKGFub255bW91c1wpKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjggMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA1IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKOSAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxNzQxCj4+CnN0cmVhbQpHYXRtO2dOKSUuJSI2SCdpNmdmL1dpM1EnL146LF1TWWhUL2c5cyksKElrLE5bWltTUFBbND1mSyUuY2JgUV48Y0E8TFVTJmldayQlT19CMnJYZXJjWTYhS2puRzhYVG5LOyQ5JChNIiRHQXJpZ0hwOGFrYzdtLFNmUTNTZCYpYiNkZ2I7O15FLXNUPWddM2l1Kz0pdDQvZT87R1JJJF1mKUpzaVpcXTIpQCk5XUBGamxLS0QuMGNdPy9mVUtAY2YkKmFMIihtPkk+LiRRbmJyUT1tTlpcRyZdJGduYCM/Kzk9RCpZZEg2ZUhjJCxSZy00YkdJV1sibzwrYHUiP1YqQTpPIk1yOys9ZU9GTl4/cj4tYzgwJUEiITgiU3EvJl1WR2QzcFRHayteT2UyJUgvX19LPFpbVXFMQ2dOU0hNMENvKStjYDVIMmVfI25CU2AmRjFLcGBwXy4/OU9FWFBMLmgxYXI7aDxQRG9cWEBhWyIuUVZlJ21pS0FZImsrPSYoWz1kLD5nSUhVJF5IRTI0Yz1HQ0Y4SDxaXTVKbjlaREomJzxHXU8tVDoqajclNU5Gb1dJZ1xLbGJrTzU3UUZwWVBMSExzbypWVVNlJiZVPz9IT08lKURhZHUxXFx1cCc2bmE4SHBUOkpsKFttdCxHSF9cWW9CI1Mxb0hdQ0Fnc1tCP1AyckduVlVrWlpHNEwkOl1ubjkhI05wL3BebEBOcm47MTByVlBSdDFKXjNoVjItVCJnRlwqQWZZKFlmMzs2WG48ci1saFZHNTMpLF5FLEArJnBcSlFEKSReL3AwaUFzSGYwUl0qZGFdOys+TyJPTnRrcFM8SGhWZ24jWChTOiNrUDA6PDI0dU1OP2U0T0EpX00zM0lTRFsjMHFDQz5aRDxGVDQxYnJwWjpxS3VvdGwmKVcmXllHdT1vV3A2ODBNLGkpaToyKlFdI3EpSWhSRzlHa11qIS5XZ2Znb0ZjOnFTcjVyXSJ0YWFIUyRoOzdUS1lVJFQpaFtAZi0nTyU3cTh1PmMrODlQK2YucWYpaV5uTUguM3EudWs0TkFJWD88LD5YJUk/VTFZUi9fLGpqZF4nUmZaRGZdQi0/ODc2SGw7XVk0T1YtMTV1Iz1aMiFsUEg3KilDTEJqTzpwIW1WQy02NT4vTFgrPmNIZC44bS0rJzBqXXMoUEV0JWM0MlsrLGNJOiQ3PU4yJyteTmM3Ji9GZmBjPGJGMC9BITshbG9MS25OQWheQDYza2Jqck1mKVU8cURbLCE3PkkoNFtRIzRdZkNzLTooOUBTIjplTWk4M2ReRCQpNXVvYGNUNkQyWkQldStPWCdLX0IhNzAsK2xYX1Etb2xeSWwpJVIyM0RRb1JlYWQlQltCSGBGMVB1Z3EmSjJjMytXME0/Jidqa1ZaNSpwTFxVWl4rTDFXWDk/I1hlM0gxWWUrTl0jSDQwWG5UPnEhXiRPZWRBOTxdKz1GYG1wWnJHSDgoPk8+WlFtSGkmRXBXQSZRdXNIcVE1bV8tLkdvV2pmbDktbzJfclw0SVdvIzAkYi1gXV1calVcOSNRIVs2WjoicUMyRVNfOTs/OlVWUHJcY2ptNlhpc2svNlQpQ0FAZV5qSzQ3cENJUltVUyxVTDgrOGUmckdQM2knLTFlanNoUzkqPWMzYl50UUY9MzlUMFZJY0guMDRaM2RnZCMzWmNINCwpUUBAL206Qz8jLklJLzMhTG4/PztoaltjNz1xVCYoNCxBJ2pAbkU/M0UyJCxnLURjJWY0ZDZNZmJtQkBPKTBXKzcoU0U3V0twOXFtJidsbDc6M2NyQWpCUCwtdF1FMDxAOT9WLDsyZC5ZZ0RfNGQ6cWpjPVVhOytATjd0ISU+K2NcPFZRUUcoKURHcDAyOCVtIkQrIU5bTXAlUWxPQiNLN1k3Xlo+WWdWbEFqN1M/W0UjO18zXWdSOkZIUW5EaCpCcUhxXCFtY0ZWV0o7OGRvU1NzVi9NQy11byM4VT4mUTYjPDZbUixUZ3AtKWdjcGEiaFRKXFYiO2I2KFtBZlJNdVtNQCdhWmhLU1xWLSYuTUQwRiwsJU5JLitiaVRvLGRTKzIuWi4wQD0sQFMtUzpTYVQlLmBdVzBeJEsqMkI/LjQjVDBHI19lZTFyTT1MOFhpJytGR2BHZ0YoRGdRJmlDP1lYZUMrLS5WMWx1XktWZXNMOGBaI0lRcl5GWkxDVDJUO1Y6ZV1ia2IoOGxJOSFhPmU+W21KdTJSby0+UXRwVSVLXihlb1YjOzQ+QTEyVzlxKjZLSSFrMExOP1tdZ2JjTUR1Omk4P2dBL2YoWX4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MDggMDAwMDAgbiAKMDAwMDAwMDYwMSAwMDAwMCBuIAowMDAwMDAwNjY5IDAwMDAwIG4gCjAwMDAwMDA5NDkgMDAwMDAgbiAKMDAwMDAwMTAwOCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw3ZTM4YmFjMmM0YWIxNTRhN2FiODgxNzI1ZjY1NThlYj48N2UzOGJhYzJjNGFiMTU0YTdhYjg4MTcyNWY2NTU4ZWI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgoyODQwCiUlRU9GCg==';
// Canned Synth reply for demo users, so a diagnostic response always appears even if the live API is down.
const DEMO_SYNTH_REPLY = "Confirmed: this is a Valvetronic eccentric shaft position fault (P134F) on the N55 engine.\n\nThe symptom set \u2014 no throttle response, pedal-to-floor, vehicle limited to roughly 10 MPH \u2014 is the classic signature of the DME forcing limp mode because it can't achieve the commanded eccentric shaft position. The Valvetronic system varies intake valve lift through a servo-driven eccentric shaft; when that shaft can't reach the commanded position, the engine loses usable power. Your failed relearn attempt points to a mechanical fault rather than a simple adaptation issue.\n\nMost likely root cause: wear or stripped teeth on the eccentric shaft gear, or a failing Valvetronic motor.\n\nRecommended next steps: inspect the eccentric shaft gear for wear, verify the Valvetronic motor can drive the shaft, and if gear damage is confirmed, replace the eccentric shaft assembly and perform the limit-position relearn with an ISTA/ISTA+ capable tool.";

// === Defense-in-depth: scrub internal Synth markers before display ===
// Mike's server-side response scanner is the primary scrubber. This client-side
// filter catches patterns that slip past the server scanner (e.g., the KB GATE
// pre-flight block, pre_flight.py source listings, VERDICT lines naming the
// internal logic). Defensive layer — primary fix lives in the Synth API.
// Condense a scanner export for inlining into the Synth prompt.
// A .pids file stores each PID as a long run of <sample> tags (hundreds each),
// so a flat character cap only ever reaches the first few PIDs and Synth reports
// "insufficient data". This parses the .pids XML and emits a compact per-PID
// summary (min / max / avg / first / last) across ALL PIDs — every channel Synth
// needs, in a fraction of the size. Non-.pids text falls back to a generous raw cap.
function summarizeScannerData(raw: string): string {
  const nl = String.fromCharCode(10);
  const isPids = /<pids-collection/i.test(raw) || /<pid\b[^>]*\bname=/i.test(raw);
  if (!isPids) {
    // Plain text/csv export: send a generous slice (was 1500 — too small for real dumps).
    const CAP = 50000;
    return raw.length > CAP
      ? raw.substring(0, CAP) + nl + `[...truncated; ${raw.length} total chars]`
      : raw;
  }
  const lines: string[] = [];
  // Iterate each <pid ... name="X"> ... </pid> block.
  const pidRe = /<pid\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/pid>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = pidRe.exec(raw)) !== null && count < 200) {
    const name = m[1];
    const body = m[2];
    const vals: number[] = [];
    const sampleRe = /<sample\b[^>]*>([^<]*)<\/sample>/gi;
    let s: RegExpExecArray | null;
    let firstStr = '', lastStr = '';
    let nSamples = 0;
    while ((s = sampleRe.exec(body)) !== null) {
      const txt = (s[1] || '').trim();
      if (nSamples === 0) firstStr = txt;
      lastStr = txt;
      nSamples++;
      const num = parseFloat(txt);
      if (!isNaN(num)) vals.push(num);
    }
    if (nSamples === 0) continue;
    count++;
    if (vals.length > 0) {
      const min = Math.min(...vals), max = Math.max(...vals);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const r = (n: number) => (Math.round(n * 100) / 100);
      lines.push(`${name}: min=${r(min)} max=${r(max)} avg=${r(avg)} first=${r(vals[0])} last=${r(vals[vals.length - 1])} (n=${nSamples})`);
    } else {
      // non-numeric PID (status strings) — show first/last/distinct
      lines.push(`${name}: first="${firstStr}" last="${lastStr}" (n=${nSamples})`);
    }
  }
  if (lines.length === 0) {
    // fallback if parsing failed for any reason
    return raw.substring(0, 50000);
  }
  return `Live data capture summarized across ${lines.length} PIDs (min/max/avg/first/last per channel):${nl}${lines.join(nl)}`;
}

function scrubInternalMarkers(content: string): string {
  if (!content) return content;
  let s = content;
  // Strip the <<REPORT_FINAL: {...}>> marker. Synth is supposed to strip this
  // server-side, but it can arrive in the SSE stream; never show the raw marker
  // (or a partially-streamed opener) to the user. Matches the full marker incl.
  // multi-line JSON and the closing '>>', plus any dangling opener.
  s = s.replace(/<<\s*REPORT_FINAL\s*:[\s\S]*?>>/gi, '');
  s = s.replace(/<<\s*REPORT_FINAL\s*:[\s\S]*$/gi, '');
  // Strip [KB GATE] ... [/KB GATE] blocks (the pre-flight KB-check output)
  s = s.replace(/\[KB GATE\][\s\S]*?\[\/KB GATE\]\s*/g, '');
  // Strip fenced code blocks that reference internal scripts/paths
  s = s.replace(/```(?:bash|python|sh|py)?\b[\s\S]*?(?:pre_flight|py -3\.12|C:[/\\]Users|sqlite3|mistake_logger|mike_theories|synth_diagnostic_rules)[\s\S]*?```\s*/gi, '');
  // Strip "KB GATE \u2014 ..." preamble headings (with or without bold)
  s = s.replace(/^\s*\*{0,2}KB GATE\s*[\u2014\-].*$/gmi, '');
  // Strip "[Running ...]" progress lines
  s = s.replace(/^\s*\[Running[^\]]*\]\s*$/gm, '');
  // Strip VERDICT: lines that name internal logic (KB match, first principles, cache match)
  s = s.replace(/^\s*\*{0,2}VERDICT:?\s.*(?:KB match|first principles|knowledge base|cache match).*\*{0,2}\s*$/gmi, '');
  // Collapse multiple blank lines created by the strips
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

interface Message { id: string; role: 'user' | 'synth'; content: string; ts: number; }

// Extract the structured report JSON from a <<REPORT_FINAL:{...}>> marker if
// present in the stream. Synth's synthesis output (findings, root_cause,
// recommendation, critical_findings, cost_savings) rides in this marker.
// Returns null if no parseable marker is found.
function parseReportFinal(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const m = raw.match(/<<\s*REPORT_FINAL\s*:\s*([\s\S]*?)>>/i);
  if (!m) return null;
  let body = m[1].trim();
  // Tolerate a trailing partial / code fences.
  body = body.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  try { return JSON.parse(body); } catch { /* fallthrough */ }
  // Try to salvage the first {...} object if there's trailing junk.
  const obj = body.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch { return null; } }
  return null;
}

// Synth is the only source of truth for the report. The PDF is the body.
// No client-side fields except what arrives in the SSE final chunk.
interface SynthReport {
  pdf_base64: string;
  pdf_filename: string;
  confidence: number;
  // Structured synthesis fields parsed from the <<REPORT_FINAL:{...}>> marker,
  // saved to diagnostic_reports on completion. Optional — absent if Synth
  // didn't emit a parseable marker (e.g. while the model-string issue persists).
  synthesis?: Record<string, unknown> | null;
}


// === Diagnostic persistence (direct to shared Supabase) ===
// On report completion, dual-write the HTML report to the diagnostic-reports
// storage bucket and the case record to diagnostic_case_studies.
// Fire-and-forget; never blocks UI. Uses the public anon key — RLS on the
// target table/bucket controls write permission.
const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function escapeHtmlForReport(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDiagnosticHtmlReport(params: {
  unid: string;
  vehicle: Vehicle;
  codes: string[];
  complaint: string;
  diagnosis: string;
  messages: Message[];
  shopName: string;
}): string {
  const { unid, vehicle, codes, complaint, diagnosis, messages, shopName } = params;
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean).join(' ') || 'Unknown Vehicle';
  const now = new Date().toLocaleString();
  const lines: string[] = [];
  lines.push('<!DOCTYPE html>');
  lines.push('<html><head><meta charset="UTF-8">');
  lines.push('<title>' + escapeHtmlForReport(unid) + ' - ' + escapeHtmlForReport(vehicleLabel) + ' - Diagnostic Report</title>');
  lines.push('<style>');
  lines.push('body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#222;margin:0;padding:32px;background:#fff;}');
  lines.push('h1{margin:0 0 6px;font-size:24px;color:#0a1a3a;}');
  lines.push('h2{margin:24px 0 12px;font-size:16px;color:#0a1a3a;border-bottom:1px solid #ddd;padding-bottom:6px;}');
  lines.push('.meta{color:#666;font-size:13px;margin-bottom:24px;} .meta div{margin:2px 0;}');
  lines.push('table{border-collapse:collapse;width:100%;margin:8px 0;} td{padding:4px 8px;vertical-align:top;font-size:14px;} td.label{color:#666;width:140px;}');
  lines.push('ul{margin:4px 0;padding-left:24px;}');
  lines.push('.conversation{background:#f7f7f9;border-radius:8px;padding:16px;}');
  lines.push('.diagnosis{background:#fff8e1;border-left:3px solid #f0b400;padding:12px 16px;border-radius:4px;white-space:pre-wrap;}');
  lines.push('.footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;color:#888;font-size:12px;}');
  lines.push('.msg{margin:12px 0;} .msg-tech strong{color:#0066cc;} .msg-synth strong{color:#0a7d3b;}');
  lines.push('</style></head><body>');
  lines.push('<h1>TechPulse Diagnostic Report</h1>');
  lines.push('<div class="meta">');
  lines.push('<div><strong>Shop:</strong> ' + escapeHtmlForReport(shopName || 'TechPulse') + '</div>');
  lines.push('<div><strong>UNID:</strong> ' + escapeHtmlForReport(unid) + '</div>');
  lines.push('<div><strong>Generated:</strong> ' + escapeHtmlForReport(now) + '</div>');
  lines.push('</div>');
  lines.push('<h2>Vehicle</h2><table>');
  lines.push('<tr><td class="label">Year / Make / Model</td><td>' + escapeHtmlForReport(vehicleLabel) + '</td></tr>');
  lines.push('<tr><td class="label">Engine</td><td>' + escapeHtmlForReport(vehicle.engine || '-') + '</td></tr>');
  lines.push('<tr><td class="label">Mileage</td><td>' + escapeHtmlForReport(vehicle.mileage || '-') + '</td></tr>');
  lines.push('<tr><td class="label">VIN</td><td>' + escapeHtmlForReport(vehicle.vin || '-') + '</td></tr>');
  lines.push('</table>');
  lines.push('<h2>Customer Complaint</h2>');
  if (complaint) {
    lines.push('<p>' + escapeHtmlForReport(complaint) + '</p>');
  } else {
    lines.push('<p style="color:#666;">Not provided.</p>');
  }
  lines.push('<h2>DTC Codes</h2>');
  if (codes && codes.length) {
    lines.push('<ul>' + codes.map(c => '<li>' + escapeHtmlForReport(c) + '</li>').join('') + '</ul>');
  } else {
    lines.push('<p style="color:#666;">No DTC codes recorded.</p>');
  }
  lines.push('<h2>Diagnostic Findings</h2>');
  if (diagnosis) {
    lines.push('<div class="diagnosis">' + escapeHtmlForReport(diagnosis) + '</div>');
  } else {
    lines.push('<p style="color:#666;">No diagnosis available.</p>');
  }
  lines.push('<h2>Conversation Log</h2><div class="conversation">');
  if (messages && messages.length) {
    for (const m of messages) {
      const role = m.role === 'user' ? 'TECH' : 'SYNTH';
      const cls = m.role === 'user' ? 'msg msg-tech' : 'msg msg-synth';
      lines.push('<div class="' + cls + '"><strong>' + role + ':</strong><div style="white-space:pre-wrap;margin-top:4px;">' + escapeHtmlForReport(m.content || '') + '</div></div>');
    }
  } else {
    lines.push('<span style="color:#666;">No messages.</span>');
  }
  lines.push('</div>');
  lines.push('<div class="footer">Generated by TechPulse - ' + escapeHtmlForReport(unid) + '</div>');
  lines.push('</body></html>');
  return lines.join('\n');
}


// Accept any file - detect issues in JS rather than blocking at browser level
function cleanFileContent(raw: string): string {
  const nl = String.fromCharCode(10);
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ')
    .replace(/%%[A-Z]+/g, '')
    .replace(/endobj|endstream|stream/gi, nl)
    .split(nl)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 2 && !/^[\d\s\[\]<>\/]+$/.test(l))
    .join(nl)
    .trim()
    .substring(0, 3000);
}

function isBinaryContent(content: string): boolean {
  const nonPrintable = content.split('').filter(
    (c: string) => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\r' && c !== '\t'
  ).length;
  return (nonPrintable / Math.max(content.length, 1)) > 0.15;
}

function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id:'vin', label:'Vehicle' }, { id:'codes', label:'Codes' },
    { id:'chat', label:'Diagnose' }, { id:'report', label:'Report' }, { id:'feedback', label:'Confirm' },
  ];
  const idx = steps.findIndex(s => s.id === step);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 24px', borderBottom:'1px solid var(--border-card)', background:'var(--bg-card)', flexShrink:0 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display:'flex', alignItems:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700,
              background: i < idx ? '#10b981' : i === idx ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
              color: i <= idx ? '#fff' : 'var(--text-3)',
              border: i === idx ? '2px solid rgba(0,195,255,0.4)' : '2px solid transparent',
              boxShadow: i === idx ? '0 0 12px rgba(0,195,255,0.3)' : 'none' }}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontSize:10, fontWeight: i === idx ? 700 : 500, color: i === idx ? 'var(--accent)' : i < idx ? '#10b981' : 'var(--text-3)', whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width:36, height:2, background: i < idx ? '#10b981' : 'var(--border-card)', margin:'0 4px 16px', transition:'background 0.3s' }} />}
        </div>
      ))}
    </div>
  );
}

function VinStep({ onNext, initialVehicle }: { onNext: (vehicle: Vehicle, uploadedReport?: string, fileName?: string, pdfBase64?: string) => void; initialVehicle?: Vehicle }) {
  const [vin, setVin] = useState(initialVehicle?.vin || '');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanningVin, setScanningVin] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [fileError, setFileError] = useState('');
  const [pdfHandoffError, setPdfHandoffError] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle>(initialVehicle || { year:'', make:'', model:'', engine:'', mileage:'', vin:'' });
  const [showManual, setShowManual] = useState(!!initialVehicle);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileError('');
    setPdfHandoffError('');
    // PDF: size gate at upload only ------ base64 is read on "Continue" (avoids FileReader race)
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const sizeMsg = getPdfSizeViolationMessage(file);
      if (sizeMsg) {
        setFileError(sizeMsg);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      setUploadedFile(file);
      setUploadedContent(`[PDF: ${file.name} (${(file.size/1024).toFixed(0)} KB) - Enter DTC codes above and describe symptoms below.]`);
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      // Detect binary/PDF content
      if (isBinaryContent(raw)) {
        setFileError(
          file.name.toLowerCase().endsWith('.pdf')
            ? 'PDF files cannot be read as text. In your scanner tool, use Save/Export to save as .txt or .csv instead.'
            : 'This file appears to contain binary data. Please use a plain text export from your scanner (.txt or .csv).'
        );
        setUploadedFile(null);
        return;
      }
      const cleaned = cleanFileContent(raw);
      setUploadedContent(cleaned);
      // Extract vehicle info from .pids XML attributes
      const pidsMatch = cleaned.match(/pids-collection[^>]+year=["']([^"']+)["'][^>]+make=["']([^"']+)["'][^>]+model=["']([^"']+)["']/i)
        || cleaned.match(/pids-collection[^>]+make=["']([^"']+)["'][^>]+model=["']([^"']+)["']/i);
      if (pidsMatch) {
        const yr = pidsMatch[1]||"", mk = pidsMatch[2]||"", mdl = (pidsMatch[3]||pidsMatch[2]||"").replace(/\s*\([^)]*\)/,"").trim();
        setVehicle(v => ({ ...v, year: yr||v.year, make: mk||v.make, model: mdl||v.model }));
      }
      // Extract VIN from uploaded file (17-char alphanumeric)
      const fileVinMatch = cleaned.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
      if (fileVinMatch) { setVin(fileVinMatch[1]); setVehicle(v => ({ ...v, vin: fileVinMatch[1] })); }
      // Auto-detect VIN
      const vinMatch = raw.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      if (vinMatch) setVin(vinMatch[0]);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    setShowCamera(false); setCameraError('');
  };
  const startCamera = async () => {
    setCameraError(''); setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width:{ideal:1280}, height:{ideal:720} } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch(e) { setCameraError('Camera access denied. Please allow camera permissions.'); setShowCamera(false); }
  };
  const captureAndScanVin = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanningVin(true);
    const ctx2 = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx2.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.9).split(',')[1];
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:100,
          messages:[{ role:'user', content:[
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:base64 }},
            { type:'text', text:'Extract the 17-character VIN (Vehicle Identification Number) from this image. Reply with ONLY the 17-character VIN, nothing else. If you cannot find a valid 17-character VIN, reply with NONE.' }
          ]}]
        })
      });
      const json = await res.json();
      const text = (json.content?.[0]?.text||'').trim().toUpperCase();
      const vinMatch = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      if (vinMatch) {
        setVin(vinMatch[0]);
        setVehicle((v:any)=>({...v, vin:vinMatch[0]}));
        stopCamera();
        setTimeout(handleVinLookup, 100);
      } else { setCameraError('No VIN found in image. Try again with better lighting.'); }
    } catch(e) { setCameraError('Scan failed. Try typing the VIN manually.'); }
    setScanningVin(false);
  };

  const handleVinLookup = async () => {
    const code = vin.trim().toUpperCase();
    if (code.length < 11) return;
    setLookingUp(true);
    setLookupError('');
    try {
      const res = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/' + encodeURIComponent(code) + '?format=json');
      if (!res.ok) throw new Error('decode http ' + res.status);
      const data = await res.json();
      const rows: Array<{ Variable: string; Value: string | null }> = data?.Results || [];
      const get = (name: string) => (rows.find(r => r.Variable === name)?.Value || '').trim();
      const year = get('Model Year');
      const make = get('Make');
      const model = get('Model');
      const dispRaw = get('Displacement (L)');
      const dispNum = parseFloat(dispRaw);
      const disp = isNaN(dispNum) ? '' : dispNum.toFixed(1);
      const fuel = get('Fuel Type - Primary');
      const cyl = get('Engine Number of Cylinders');
      // Build a readable engine string from whatever decoded.
      const engine = [disp ? disp + 'L' : '', cyl ? cyl + '-cyl' : '', fuel].filter(Boolean).join(' ');

      if (!year && !make && !model) {
        // Nothing usable decoded — let them proceed manually rather than block.
        setLookupError('Could not decode this VIN. Check it, or enter the vehicle details manually below.');
        setVehicle(v => ({ ...v, vin: code }));
        setShowManual(true);
        return;
      }
      // Title-case make (NHTSA returns it uppercase).
      const makeTC = make ? make.charAt(0) + make.slice(1).toLowerCase() : '';
      setVehicle(v => ({
        ...v,
        vin: code,
        year: year || v.year,
        make: makeTC || v.make,
        model: model || v.model,
        engine: engine || v.engine,
      }));
      setShowManual(true);
    } catch {
      // NHTSA unreachable — don't block the tech; accept VIN and show manual entry.
      setLookupError('VIN lookup is temporarily unavailable. Enter the vehicle details manually below.');
      setVehicle(v => ({ ...v, vin: code }));
      setShowManual(true);
    } finally {
      setLookingUp(false);
    }
  };

  const canProceed = !!uploadedFile || vin.length >= 10 || (vehicle.year && vehicle.make && vehicle.model && vehicle.engine);
  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:10, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:14, outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:580 }}>
        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 6px' }}>New Diagnostic</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:0 }}>Enter a VIN to look up the vehicle, or upload a scanner export to auto-populate codes.</p>
        </div>

        {/* VIN */}
        <div style={{ padding:'20px', borderRadius:16, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Car size={16} color='var(--accent)' />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Enter VIN</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} placeholder='e.g. 1HGBH41JXMN109186' maxLength={17}
              onKeyDown={e => e.key === 'Enter' && handleVinLookup()}
              style={{ ...inp, flex:1, fontFamily:'monospace', letterSpacing:'0.08em', fontSize:15, fontWeight:600 }} />
            <button onClick={handleVinLookup} disabled={vin.length < 10 || lookingUp}
              style={{ padding:'11px 16px', borderRadius:10, border:'none', cursor: vin.length >= 10 ? 'pointer' : 'not-allowed',
                background: vin.length >= 10 ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
                color: vin.length >= 10 ? '#fff' : 'var(--text-3)', fontSize:13, fontWeight:700,
                display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
              <Search size={14} /> {lookingUp ? 'Looking up' : 'Look Up'}
            </button>
          <button onClick={showCamera ? stopCamera : startCamera}
            title='Scan VIN with camera'
            style={{ padding:'11px 14px', borderRadius:10, border:'1px solid var(--border-card)', cursor:'pointer',
              background: showCamera ? '#ef4444' : 'var(--bg-input)', color: showCamera ? '#fff' : 'var(--text-2)',
              fontSize:18, display:'flex', alignItems:'center', flexShrink:0 }}>
            {showCamera ? '✕' : '📷'}
          </button>
          </div>
          {cameraError && <p style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{cameraError}</p>}
          {lookupError && <p style={{ color:'#f59e0b', fontSize:12, marginTop:8 }}>{lookupError}</p>}
          {showCamera && (
            <div style={{ marginTop:12, borderRadius:12, overflow:'hidden', border:'1px solid var(--border-card)', position:'relative' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', display:'block', borderRadius:12 }} />
              <canvas ref={canvasRef} style={{ display:'none' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px', background:'linear-gradient(transparent,rgba(0,0,0,0.7))', display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={captureAndScanVin} disabled={scanningVin}
                  style={{ padding:'10px 18px', borderRadius:10, border:'none', cursor: scanningVin?'not-allowed':'pointer',
                    background:'linear-gradient(135deg,#00c3ff,#0055ff)', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>
                  {scanningVin ? 'Scanning...' : 'Scan VIN'}
                </button>
                <p style={{ color:'rgba(255,255,255,0.75)', fontSize:11, margin:0 }}>Point at VIN sticker (door jamb or windshield)</p>
              </div>
            </div>
          )}
          {vin.length > 0 && vin.length < 17 && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>{17 - vin.length} characters remaining</div>}
          {(showManual || vin.length === 17) && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border-card)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:10, letterSpacing:'0.06em' }}>VEHICLE DETAILS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {(['year','make','model','engine','mileage'] as const).map(f => (
                  <div key={f}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:5, textTransform:'uppercase' }}>{f}</label>
                    <input value={vehicle[f]} onChange={e => setVehicle(p => ({...p, [f]: e.target.value}))}
                      placeholder={f==='year'?'2015':f==='make'?'Ford':f==='model'?'F-150':f==='engine'?'3.5L EcoBoost':'87500'}
                      style={{ ...inp, fontSize:13 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {!showManual && vin.length < 17 && (
            <button onClick={() => setShowManual(true)} style={{ marginTop:10, background:'none', border:'none', color:'var(--accent)', fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>
              + Enter vehicle details manually
            </button>
          )}
        </div>

        {/* OR */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'var(--border-card)' }} />
          <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>OR</span>
          <div style={{ flex:1, height:1, background:'var(--border-card)' }} />
        </div>

        {/* Upload  accept=* so all files show in picker; binary detected in JS */}
        <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onClick={() => !uploadedFile && fileRef.current?.click()}
          style={{ padding:'28px 20px', borderRadius:16, textAlign:'center', cursor: uploadedFile ? 'default' : 'pointer',
            background: dragOver ? 'rgba(0,195,255,0.06)' : uploadedFile ? 'rgba(16,185,129,0.06)' : 'var(--bg-feed)',
            border: `2px dashed ${dragOver ? 'var(--accent)' : uploadedFile ? '#10b981' : fileError ? '#ef4444' : 'var(--border-card)'}`,
            transition:'all 0.2s', marginBottom: fileError ? 8 : 16 }}>
          {/* accept=*  all files visible in picker; PDF/binary rejected in handleFile */}
          <input ref={fileRef} type='file' style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {uploadedFile ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={20} color='#10b981' />
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#10b981' }}>{uploadedFile.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{(uploadedFile.size / 1024).toFixed(1)} KB uploaded</div>
                {vin && <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>VIN detected: <strong style={{ color:'var(--text-1)', fontFamily:'monospace' }}>{vin}</strong></div>}
              </div>
              <button onClick={e => { e.stopPropagation(); setUploadedFile(null); setUploadedContent(''); setFileError(''); setPdfHandoffError(''); if (fileRef.current) fileRef.current.value = ''; }}
                style={{ marginLeft:8, width:28, height:28, borderRadius:7, background:'rgba(239,68,68,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={14} color='#f87171' />
              </button>
            </div>
          ) : (
            <>
              <div style={{ width:48, height:48, borderRadius:14, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Upload size={22} color='var(--text-3)' />
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Upload Diagnostic Report</div>
              <div style={{ fontSize:13, color:'var(--text-3)' }}>Drag & drop or click to browse  all file types accepted</div>
            </>
          )}
        </div>

        {fileError && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', gap:8, alignItems:'flex-start', marginBottom:16 }}>
            <AlertTriangle size={15} color='#f87171' style={{ flexShrink:0, marginTop:1 }} />
            <span style={{ fontSize:13, color:'#f87171', lineHeight:1.5 }}>{fileError}</span>
          </div>
        )}

        {pdfHandoffError && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', gap:8, alignItems:'flex-start', marginBottom:16 }}>
            <AlertTriangle size={15} color='#f87171' style={{ flexShrink:0, marginTop:1 }} />
            <span style={{ fontSize:13, color:'#f87171', lineHeight:1.5 }} role="alert">{pdfHandoffError}</span>
          </div>
        )}

        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-feed)', border:'1px solid var(--border-card)', display:'flex', gap:8, alignItems:'flex-start', marginBottom:20 }}>
          <Info size={14} color='var(--text-3)' style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.5 }}>
            <strong style={{ color:'var(--text-2)' }}>Scanner tip:</strong> You can upload a PDF directly; wait for &quot;Preparing PDF------&quot; to finish before codes if the file is large. .txt or .csv exports work too (AUTEL, Launch, Snap-on Save/Export).
          </span>
        </div>

        <button
          onClick={async () => {
            if (!canProceed || isPreparingPdf) return;
            const fileAtClick = uploadedFile;
            const vehicleAtClick = { ...vehicle, vin };
            const contentAtClick = uploadedContent || undefined;
            const nameAtClick = fileAtClick?.name;
            setPdfHandoffError('');
            let b64: string | undefined;
            if (fileAtClick && (fileAtClick.type === 'application/pdf' || fileAtClick.name.toLowerCase().endsWith('.pdf'))) {
              setIsPreparingPdf(true);
              try {
                assertAcceptableScannerPdf(fileAtClick);
                b64 = await readPdfAsRawBase64(fileAtClick);
              } catch (e) {
                setPdfHandoffError(e instanceof Error ? e.message : "Couldn't read PDF, try re-uploading.");
                return;
              } finally {
                setIsPreparingPdf(false);
              }
            }
            onNext(vehicleAtClick, contentAtClick, nameAtClick, b64);
          }}
          disabled={!canProceed || isPreparingPdf}
          style={{ width:'100%', padding:'14px', borderRadius:12,
            background: canProceed && !isPreparingPdf ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
            color: canProceed && !isPreparingPdf ? '#fff' : 'var(--text-3)', fontSize:15, fontWeight:700, border:'none',
            cursor: canProceed && !isPreparingPdf ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {isPreparingPdf ? 'Preparing PDF------' : (<><span>Continue to Codes</span> <ChevronRight size={18} /></>)}
        </button>
      </div>
    </div>
  );
}

function CodesStep({ vehicle, uploadedReport, fileName, onNext, onBack, initialCodes, initialSymptoms }:
  { vehicle: Vehicle; uploadedReport?: string; fileName?: string; onNext: (codes: DtcCode[], symptoms: string) => void; onBack: () => void; initialCodes?: DtcCode[]; initialSymptoms?: string }
) {
  const [codes, setCodes] = useState<DtcCode[]>(initialCodes && initialCodes.length > 0 ? initialCodes : [{ code:'', description:'' }]);
  const [symptoms, setSymptoms] = useState(initialSymptoms || '');
  useEffect(() => {
    if (uploadedReport) {
      // OBD-II style: P/B/C/U + 4 hex chars (covers P0171 and manufacturer hex like P134F); not extracted from PDF placeholder text
      const matches = [...uploadedReport.matchAll(/\b([PBCU][0-9A-F]{4})\b/gi)];
      if (matches.length > 0) {
        const seen = new Set<string>();
        const extracted = matches.map(m => m[1].toUpperCase()).filter(c => { if (seen.has(c)) return false; seen.add(c); return true; }).map(c => ({ code:c, description:'' }));
        setCodes(extracted.length > 0 ? extracted : [{ code:'', description:'' }]);
      }
    }
  }, [uploadedReport]);
  const addCode = () => setCodes(p => [...p, { code:'', description:'' }]);
  const removeCode = (i: number) => setCodes(p => p.filter((_,idx) => idx !== i));
  const updateCode = (i: number, field: keyof DtcCode, val: string) => setCodes(p => p.map((c,idx) => idx===i ? {...c,[field]:val} : c));
  const validCodes = codes.filter(c => c.code.trim());
  const hasUploadedReport = Boolean(uploadedReport?.trim());
  const canProceed =
    validCodes.length > 0 || symptoms.trim().length > 5 || hasUploadedReport;
  const inp: React.CSSProperties = { padding:'10px 12px', borderRadius:9, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:13, outline:'none', boxSizing:'border-box' };
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:560 }}>
        <div style={{ padding:'12px 16px', borderRadius:12, background:'var(--bg-feed)', border:'1px solid var(--border-card)', marginBottom:24, display:'flex', alignItems:'center', gap:10 }}>
          <Car size={15} color='var(--accent)' />
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>
            {vehicle.year && vehicle.make
              ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? '  ' + vehicle.engine : ''}`
              : vehicle.vin ? `VIN: ${vehicle.vin}` : 'Vehicle not specified'}
          </span>
          {uploadedReport && <span style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', fontSize:11, fontWeight:700, color:'#10b981' }}>{fileName || 'Report loaded'}</span>}
        </div>
        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 6px' }}>DTC Codes</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:0 }}>
            {uploadedReport && validCodes.length > 0
              ? 'Codes extracted from your report ------ review and edit as needed.'
              : hasUploadedReport

                ? 'Add codes or symptoms if you want ------ or start diagnosis using your uploaded report alone.'
                : 'Enter fault codes from your scanner, or describe the symptoms.'}
          </p>

          {uploadedReport && (
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:8, marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20, color:'#10b981' }}>&#10003;</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>Scanner report uploaded &#8212; {fileName || 'file'}</div>
                <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>Synth will read the full report automatically. Add P-codes or extra notes below if needed, or just click Start Diagnosis.</div>
              </div>
            </div>
          )}

        </div>
        <div style={{ marginBottom:16 }}>
          {codes.map((c, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
              <input
                value={c.code}
                onChange={e => updateCode(i,'code',e.target.value.toUpperCase())}
                placeholder="Pxxxx"
                autoComplete="off"
                name={`dtc-code-${i}`}
                style={{ ...inp, width:100, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.05em' }}
              />
              <input
                value={c.description}
                onChange={e => updateCode(i,'description',e.target.value)}
                placeholder="Description (optional)"
                autoComplete="off"
                style={{ ...inp, flex:1 }}
              />
              {codes.length > 1 && (
                <button onClick={() => removeCode(i)} style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <X size={14} color='#f87171' />
                </button>
              )}
            </div>
          ))}
          <button onClick={addCode} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background:'var(--bg-input)', border:'1px dashed var(--border-input)', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Plus size={14} /> Add code
          </button>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>Symptoms / Additional Context (optional if you uploaded a report)</label>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={4}
            placeholder='Optional: add extra context for Synth (symptoms, recent repairs, etc.)'
            style={{ ...inp, width:'100%', resize:'none', lineHeight:1.5 }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={{ padding:'13px 20px', borderRadius:12, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-2)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={() => canProceed && onNext(validCodes, symptoms)} disabled={!canProceed}
            style={{ flex:1, padding:'13px', borderRadius:12, background: canProceed ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)', color: canProceed ? '#fff' : 'var(--text-3)', fontSize:15, fontWeight:700, border:'none', cursor: canProceed ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            Start Diagnosis <Zap size={16} fill={canProceed ? '#fff' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatStep({ vehicle, codes, symptoms, uploadedReport, fileName, pdfBase64, sessionId, isDemo, initialMessages, onReport, onBack }:
  { vehicle: Vehicle; codes: DtcCode[]; symptoms: string; uploadedReport?: string; fileName?: string; pdfBase64?: string; sessionId: string; isDemo?: boolean; initialMessages?: Message[];
    onReport: (report: SynthReport, messages: Message[], updatedVehicle?: Vehicle) => void; onBack: () => void }
) {
  const nl = String.fromCharCode(10);
  const hasPdfAttachment = Boolean(pdfBase64 && pdfBase64.length > 0);
  const symptomsForSynth = (() => {
    const s = symptoms?.trim();
    if (!s) return null;
    if (!hasPdfAttachment) return s;
    const cleaned = s.split(/\r?\n/).filter((l) => !l.trim().startsWith('[PDF:')).join(nl).trim();
    return cleaned || null;
  })();
  const scannerContextLine =
    uploadedReport && hasPdfAttachment
      ? `${nl}Scanner PDF attached: ${fileName || 'report.pdf'} (full document sent separately for analysis).`
      : uploadedReport
        ? `${nl}Scanner Data (from ${fileName || 'uploaded file'}):${nl}${summarizeScannerData(uploadedReport)}`
        : null;
  const initMsg = [
    vehicle.year && vehicle.make ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? ' ' + vehicle.engine : ''}` : vehicle.vin ? `VIN: ${vehicle.vin}` : null,
    codes.length > 0 ? `DTC Codes: ${codes.map(c => c.code + (c.description ? ' (' + c.description + ')' : '')).join(', ')}` : null,
    symptomsForSynth ? `Symptoms: ${symptomsForSynth}` : null,
    scannerContextLine,
  ].filter(Boolean).join(nl);
  const [messages, setMessages] = useState<Message[]>(initialMessages && initialMessages.length ? initialMessages : []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // === Pipeline status cycle ===
  // While loading, surface what Synth is actually doing per /health pipeline
  // (tsb+cases+patterns+baseline+confidence). Turns the buffered-response wait
  // (~5-15s) into the moat story instead of dead air.
  const PIPELINE_STAGES = [
    'Cross-referencing TSB database\u2026',
    'Searching 6,000+ diagnostic case studies\u2026',
    'Matching scope patterns from 378-pattern library\u2026',
    'Comparing against vehicle baseline\u2026',
    'Building confidence score\u2026',
  ];
  const PIPELINE_STAGE_MS = 2800;
  const [pipelineStage, setPipelineStage] = useState(0);
  useEffect(() => {
    if (!loading) { setPipelineStage(0); return; }
    setPipelineStage(0);
    const id = setInterval(() => {
      setPipelineStage(p => (p + 1) % PIPELINE_STAGES.length);
    }, PIPELINE_STAGE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  // reportReady flips to true ONLY when Synth's SSE final chunk says ready_for_report:true.
  // Synth is the gate, not the user.
  const [reportReady, setReportReady] = useState(false);
  const [synthConfidence, setSynthConfidence] = useState<number>(0);
  const [pdfBase64Report, setPdfBase64Report] = useState<string>('');
  const [pdfFilenameReport, setPdfFilenameReport] = useState<string>('');
  const [reportSynthesis, setReportSynthesis] = useState<Record<string, unknown> | null>(null);
  const [chatAttachment, setChatAttachment] = useState<{name:string;base64:string}|null>(null);
  const [showVinGate, setShowVinGate] = useState(false);
  const [vinGateInput, setVinGateInput] = useState('');
  const [vinValidating, setVinValidating] = useState(false);
  const [vinGateError, setVinGateError] = useState('');
  const [vinGateCamera, setVinGateCamera] = useState(false);
  const [vinGateScanningVin, setVinGateScanningVin] = useState(false);
  const vinGateVideoRef = useRef<HTMLVideoElement>(null);
  const vinGateCanvasRef = useRef<HTMLCanvasElement>(null);
  const vinGateStreamRef = useRef<MediaStream|null>(null);
  const [warmingUp, setWarmingUp] = useState(false);
  const [autoSent, setAutoSent] = useState(Boolean(initialMessages && initialMessages.length));
  const [hasManuallyEngaged, setHasManuallyEngaged] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ok'|'placeholder'|'error'>('ok');
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);
  const stopVinGateCamera = () => {
    if (vinGateStreamRef.current) { vinGateStreamRef.current.getTracks().forEach((t:any)=>t.stop()); vinGateStreamRef.current=null; }
    setVinGateCamera(false);
  };
  const startVinGateCamera = async () => {
    setVinGateError(''); setVinGateCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment', width:{ideal:1280}, height:{ideal:720} } });
      vinGateStreamRef.current = stream;
      if (vinGateVideoRef.current) { vinGateVideoRef.current.srcObject=stream; vinGateVideoRef.current.play(); }
    } catch(e) { setVinGateError('Camera access denied. Type the VIN manually below.'); setVinGateCamera(false); }
  };
  const captureVinGate = async () => {
    if (!vinGateVideoRef.current || !vinGateCanvasRef.current) return;
    setVinGateScanningVin(true);
    const ctx2 = vinGateCanvasRef.current.getContext('2d')!;
    vinGateCanvasRef.current.width = vinGateVideoRef.current.videoWidth;
    vinGateCanvasRef.current.height = vinGateVideoRef.current.videoHeight;
    ctx2.drawImage(vinGateVideoRef.current, 0, 0);
    const b64 = vinGateCanvasRef.current.toDataURL('image/jpeg',0.9).split(',')[1];
    try {
      const res = await fetch('https://techpulse-api.onrender.com/api/ocr-vin', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_TOKEN},
        body:JSON.stringify({image_base64:b64})
      });
      const json = await res.json();
      const extracted = (json.vin||'').trim().toUpperCase();
      const vm = extracted.match(/[A-HJ-NPR-Z0-9]{17}/);
      if (vm) { setVinGateInput(vm[0]); stopVinGateCamera(); }
      else { setVinGateError('No VIN found in image. Try again or type it manually.'); }
    } catch(e) { setVinGateError('Scan failed. Type the VIN manually.'); }
    setVinGateScanningVin(false);
  };
  const validateAndViewReport = async () => {
    const vin = vinGateInput.trim().toUpperCase();
    if (vin.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      setVinGateError('Please enter a valid 17-character VIN.');
      return;
    }
    setVinValidating(true); setVinGateError('');
    try {
      const res = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/'+vin+'?format=json');
      const json = await res.json();
      const get = (label:string) => (json.Results||[]).find((r:any)=>r.Variable===label)?.Value?.toUpperCase()||'';
      const decodedMake = get('Make');
      const decodedModel = get('Model');
      const decodedYear = get('Model Year');
      const scanMake = (vehicle.make||'').toUpperCase();
      const scanModel = (vehicle.model||'').toUpperCase();
      const scanYear = (vehicle.year||'').toUpperCase();
      // If we have scanner data, verify it matches
      if (scanMake && decodedMake && !decodedMake.includes(scanMake) && !scanMake.includes(decodedMake)) {
        setVinGateError('VIN '+vin+' decodes to a '+decodedYear+' '+decodedMake+' '+decodedModel+' -- this does not match your scanner data ('+vehicle.year+' '+vehicle.make+' '+vehicle.model+'). Please check your VIN and try again.');
        setVinValidating(false); return;
      }
      // Passed -- update vehicle vin and proceed to report
      const updatedVehicle = { ...vehicle, vin, make: vehicle.make||decodedMake, model: vehicle.model||decodedModel, year: vehicle.year||decodedYear };
      stopVinGateCamera();
      setShowVinGate(false);
      onReport(
        { pdf_base64: pdfBase64Report, pdf_filename: pdfFilenameReport, confidence: synthConfidence },
        messages,
        updatedVehicle,
      );
    } catch (e) {
      // NHTSA API failed -- just accept the VIN and proceed
      stopVinGateCamera(); setShowVinGate(false);
      onReport(
        { pdf_base64: pdfBase64Report, pdf_filename: pdfFilenameReport, confidence: synthConfidence },
        messages,
        { ...vehicle, vin },
      );
    }
    setVinValidating(false);
  };



  const sendMessage = async (text: string, displayText?: string, isAuto?: boolean) => {
    if (!text.trim() || loading) return;
    if (!isAuto) setHasManuallyEngaged(true);
    const userMsg: Message = { id: Date.now()+'u', role:'user', content: displayText || text, ts:Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    // Demo users: return a canned Synth reply instead of calling the live API,
    // so a diagnostic response always appears. The demo report unlocks after the
    // user's own first message (not the automatic intro message).
    if (isDemo) {
      if (chatAttachment) setChatAttachment(null);
      if (isAuto) return;
      setLoading(true);
      // Let the diagnostic "thinking" animation run long enough to read as real
      // work (one full pipeline stage cycle), then drop the reply. The View Report
      // button reveals together with the reply, as if Synth just finished diagnosing.
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now()+'s', role: 'synth', content: DEMO_SYNTH_REPLY, ts: Date.now() }]);
        setLoading(false);
      }, 5000);
      return;
    }
    setLoading(true);
    const pdfToSend = pdfBase64 || '';
    const pdfNameToSend = pdfToSend ? (fileName || 'scan.pdf') : '';
    const attachBase64 = chatAttachment?.base64 || '';
    const attachName = chatAttachment?.name || '';
    if (chatAttachment) setChatAttachment(null);

    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 60000);
      const warmTimer = setTimeout(() => setWarmingUp(true), 5000);
      track({ event_type: 'synth_message_sent', step: 'chat', session_id: sessionId, vehicle: [vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(' '), payload: { msg_len: text.length, has_attachment: !!attachBase64 } });
      const res = await fetch(SYNTH_API + '/api/diagnostic/stream', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + API_TOKEN },
        body: JSON.stringify({ session_id:sessionId, message:text, vehicle, ...((attachBase64 && isValidPdfBase64(attachBase64)) ? { pdf_base64: attachBase64, pdf_name: attachName } : (pdfToSend && isValidPdfBase64(pdfToSend)) ? { pdf_base64: pdfToSend, pdf_name: pdfNameToSend } : {}) }),
        signal: controller.signal,
      });
        clearTimeout(abortTimer);
        clearTimeout(warmTimer);
        setWarmingUp(false);
      if (!res.ok) {
        if (res.status === 401) throw new Error('Authentication failed - please sign out and sign back in.');
        if (res.status === 403) throw new Error('Access denied. Please contact support.');
        throw new Error(`Synth is unavailable (${res.status}). Please try again.`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let rawText = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; rawText += decoder.decode(value, { stream: true }); }
      let sseContent = '';
      for (const ln of rawText.split('\n')) {
        if (!ln.startsWith('data: ')) continue;
        const payload = ln.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const p = JSON.parse(payload);
          sseContent += p.token ?? p.text ?? p.response ?? p.message ?? '';
          // Synth signals readiness via SSE sibling fields in the final chunk.
          // The <<REPORT_FINAL:...>> marker is meant to be stripped server-side, but
          // can still arrive in the stream — scrubInternalMarkers() removes it before display.
          if (p.ready_for_report) { setReportReady(true); }
          if (typeof p.confidence === 'number') { setSynthConfidence(p.confidence); }
          if (p.pdf_base64) { setPdfBase64Report(p.pdf_base64); }
          if (p.pdf_filename) { setPdfFilenameReport(p.pdf_filename); }
        }
        catch { if (payload) sseContent += payload; }
      }
      const reply = sseContent || (()=>{ try { return JSON.parse(rawText).response || JSON.parse(rawText).message || ''; } catch { return rawText.trim(); } })();
      // Capture the structured synthesis JSON from the REPORT_FINAL marker (if any)
      // before it's scrubbed for display. Saved to diagnostic_reports on completion.
      const _rf = parseReportFinal(rawText) || parseReportFinal(reply);
      if (_rf) setReportSynthesis(_rf);
      const cleanReply = scrubInternalMarkers(reply);
      setMessages(prev => [...prev, { id: Date.now()+'s', role: 'synth', content: cleanReply, ts: Date.now() }]);
      setApiStatus('ok');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setWarmingUp(false);
        setMessages(prev => [...prev, { id: Date.now()+'t', role: 'synth', content: 'Request timed out - please try again in a moment.', ts: Date.now() }]);
      } else {
      setApiStatus('error');
      setMessages(prev => [...prev, { id: Date.now()+'e', role:'synth', content:'Unable to connect to Synth. Please check your connection and try again.', ts:Date.now() }]);
      }
    } finally { setLoading(false); setWarmingUp(false); }
  };
  useEffect(() => { if (!autoSent && initMsg) { setAutoSent(true); sendMessage(initMsg, [vehicle.year && vehicle.make ? 'Analyzing: ' + vehicle.year + ' ' + vehicle.make + ' ' + vehicle.model : 'Analyzing scanner data', fileName ? '(' + fileName + ')' : '', codes.filter((c:any)=>c.code).length > 0 ? codes.filter((c:any)=>c.code).length + ' fault code(s) detected' : '', symptoms ? 'Symptoms: ' + symptoms.substring(0,80) : ''].filter(Boolean).join(' -- '), true); } }, []);

  // Warm up Synth API on load (Render free tier spins down after inactivity)
  useEffect(() => {
    fetch(`${SYNTH_API}/health`, { method: 'GET' })
      .then(r => r.ok && setApiStatus('ok'))
      .catch(() => {});
  }, []);
  const iconStyle: React.CSSProperties = { width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#00c3ff,#0055ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'flex-end' };
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {showVinGate && (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div style={{background:'var(--bg-card)',borderRadius:20,padding:28,width:'100%',maxWidth:440,border:'1px solid var(--border-card)'}}><div style={{fontSize:20,fontWeight:800,color:'var(--text-1)',marginBottom:6}}>VIN Required</div><div style={{fontSize:13,color:'var(--text-2)',marginBottom:20}}>Enter your VIN to verify this diagnostic matches your vehicle before generating the report.</div><input value={vinGateInput} onChange={e=>setVinGateInput(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,''))} placeholder='Enter 17-character VIN' maxLength={17} autoFocus style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid var(--border-card)',background:'var(--bg-input)',color:'var(--text-1)',fontSize:16,fontFamily:'monospace',letterSpacing:'0.1em',fontWeight:700,boxSizing:'border-box',marginBottom:8}} /><div style={{fontSize:11,color:'var(--text-3)',marginBottom:12}}>Found on the driver door jamb, dashboard (windshield side), or vehicle documents.</div>{vinGateError&&<div style={{fontSize:12,color:'#ef4444',marginBottom:10,lineHeight:1.5}}>{vinGateError}</div>}<div style={{display:'flex',gap:8}}><button onClick={()=>{setShowVinGate(false);setVinGateError('');setVinGateInput('');}} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid var(--border-card)',background:'var(--bg-input)',color:'var(--text-2)',fontWeight:700,fontSize:14,cursor:'pointer'}}>Cancel</button><button onClick={validateAndViewReport} disabled={vinGateInput.length!==17||vinValidating} style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:vinGateInput.length===17&&!vinValidating?'linear-gradient(135deg,#10b981,#059669)':'var(--bg-input)',color:vinGateInput.length===17&&!vinValidating?'#fff':'var(--text-3)',fontWeight:700,fontSize:14,cursor:vinGateInput.length===17&&!vinValidating?'pointer':'not-allowed'}}>{vinValidating?'Verifying VIN...':'Verify & View Report'}</button></div></div></div>)}
    {/* === VIN Gate Modal === */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border-card)', background:'var(--bg-feed)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: apiStatus==='error' ? '#ef4444' : '#34d399', boxShadow: apiStatus==='error' ? '0 0 6px rgba(239,68,68,0.8)' : '0 0 6px rgba(52,211,153,0.8)' }} />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Synth AI</span>
          </div>
          {codes.map((c,i) => <span key={i} style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)', fontSize:11, fontWeight:700, color:'#f59e0b' }}>{c.code}</span>)}
          {uploadedReport && <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', fontSize:11, fontWeight:700, color:'#10b981' }}>{fileName || 'Report'}</span>}
          {apiStatus==='placeholder' && <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', fontSize:11, color:'#f59e0b' }}>Full engine deploying</span>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onBack} style={{ padding:'6px 12px', borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-2)', fontSize:12, cursor:'pointer' }}> Back</button>
          {!isDemo && <button
            disabled={!reportReady}
            onClick={() => {
              if (!reportReady) return;
              const synthReport: SynthReport = { pdf_base64: pdfBase64Report, pdf_filename: pdfFilenameReport, confidence: synthConfidence, synthesis: reportSynthesis };
              if (vehicle.vin) { onReport(synthReport, messages); }
              else { setVinGateInput(''); setVinGateError(''); setShowVinGate(true); }
            }}
            style={{
              padding: '6px 14px', borderRadius: 8,
              background: reportReady ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-input)',
              border: 'none',
              color: reportReady ? '#fff' : 'var(--text-3)',
              fontSize: 12, fontWeight: 700,
              cursor: reportReady ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <FileText size={13} /> View Report
          </button>}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
              <div style={{ maxWidth:'72%', padding:'11px 16px', borderRadius:'16px 16px 4px 16px', background:'linear-gradient(135deg,#00c3ff,#0055ff)', color:'#fff', fontSize:13, lineHeight:1.55, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{msg.content}</div>
            </div>
          ) : (
            <div key={msg.id} style={{ display:'flex', justifyContent:'flex-start', marginBottom:14, gap:10 }}>
              <div style={iconStyle}><Zap size={14} color='#fff' fill='#fff' /></div>
              <div style={{ maxWidth:'80%', padding:'11px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-1)', fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{msg.content}</div>
            </div>
          )
        ))}
        {loading && (
          <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        {warmingUp && (
          <p className="text-xs text-amber-500 animate-pulse px-4 py-1">
            Synth is warming up - this may take a moment...
          </p>
        )}
            <div style={iconStyle}><Zap size={14} color='#fff' fill='#fff' /></div>
            <div style={{ padding:'14px 18px', borderRadius:'16px 16px 16px 4px', background:'var(--bg-card)', border:'1px solid var(--border-card)', display:'flex', gap:10, alignItems:'center', minWidth:280 }}>
              <div className="animate-pulse" style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 8px var(--accent)', flexShrink:0 }} />
              <div key={pipelineStage} style={{ fontSize:13, color:'var(--text-2)', fontWeight:500, fontStyle:'italic' }}>
                {PIPELINE_STAGES[pipelineStage]}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Demo users: report unlocks after the user sends their own message and Synth replies. */}
      {isDemo && hasManuallyEngaged && messages.some(m => m.role === 'synth') && (
        <div style={{ padding: '0 20px 12px' }}>
          <button
            onClick={() => {
              const demoReport: SynthReport = { pdf_base64: DEMO_REPORT_PDF_B64, pdf_filename: 'TechPulse_Demo_Report.pdf', confidence: 92 };
              onReport(demoReport, messages);
            }}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              boxShadow: '0 0 20px rgba(16,185,129,0.4)', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <FileText size={15} /> View Report
          </button>
        </div>
      )}

      {/* Synth-driven status. The user does not decide when the report is ready -- Synth does. */}
      {!isDemo && messages.filter((m:any) => m.role === 'synth').length > 0 && (
        <div style={{ padding: '0 20px 12px' }}>
          {!reportReady ? (
                        <button
                                      onClick={() => { if (!loading) sendMessage('FINALIZE_REPORT', 'Generating report...'); }}
                                                    disabled={loading}
                                                                  style={{
                                                                                  width: '100%', padding: '13px', borderRadius: 12,
                                                                                                  background: loading ? 'var(--bg-input)' : 'linear-gradient(135deg,#10b981,#059669)',
                                                                                                                  border: loading ? '1px solid var(--border-input)' : 'none',
                                                                                                                                  boxShadow: loading ? 'none' : '0 0 20px rgba(16,185,129,0.4)',
                                                                                                                                                  color: loading ? 'var(--text-3)' : '#fff',
                                                                                                                                                                  fontSize: 15, fontWeight: 700,
                                                                                                                                                                                  cursor: loading ? 'not-allowed' : 'pointer',
                                                                                                                                                                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                                                                                                                                                                                }}>
                                                                                                                                                                                                                              <FileText size={15} /> {loading ? 'Generating report...' : 'Generate Report'}
                                                                                                                                                                                                                                          </button>
          ) : (
            <button
              onClick={() => {
                const synthReport: SynthReport = { pdf_base64: pdfBase64Report, pdf_filename: pdfFilenameReport, confidence: synthConfidence, synthesis: reportSynthesis };
                if (vehicle.vin) { onReport(synthReport, messages); }
                else { setVinGateInput(''); setVinGateError(''); setShowVinGate(true); }
              }}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                color: '#fff',
                fontWeight: 700, fontSize: 15,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {pdfBase64Report ? 'Synth has finished -- View Report' : 'Synth has finished -- Continue'}
            </button>
          )}
        </div>
      )}

      <div style={{ padding:'10px 20px 14px', display:'flex', flexDirection:'column', gap:6, borderTop:'1px solid var(--border-card)', background:'var(--bg-card)', flexShrink:0 }}>
        {chatAttachment && (<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'rgba(0,195,255,0.1)',borderRadius:8,fontSize:11,color:'var(--text-2)'}}>
          <span style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{chatAttachment.name}</span>
          <button onClick={()=>setChatAttachment(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:14,padding:0,lineHeight:1}}>x</button>
        </div>)}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
        <input type='file' id='chat-file-input' accept='.pids,.pdf,.txt,.csv,.png,.jpg,.jpeg' style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const b64=(r.result as string).split(',')[1]||'';setChatAttachment({name:f.name,base64:b64});};r.readAsDataURL(f);e.target.value='';}} />
        <button onClick={()=>document.getElementById('chat-file-input')?.click()} title='Attach file' style={{width:38,height:38,borderRadius:9,background:'var(--bg-input)',border:'1px solid var(--border-card)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:chatAttachment?'#00c3ff':'var(--text-2)'}}>
          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d='m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'/></svg>
        </button>
        <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
          placeholder='Ask Synth a follow-up question or provide more details'
          style={{ flex:1, padding:'11px 14px', borderRadius:11, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:13, outline:'none', resize:'none' }} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg,#00c3ff,#0055ff)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: loading||!input.trim()?'not-allowed':'pointer', opacity: loading||!input.trim()?0.5:1, flexShrink:0 }}>
          <Send size={17} color='#fff' />
        </button>
        </div>
      </div>
    </div>
  );
}

function ShareWithCustomer({ synthReport, vehicle }: { synthReport: SynthReport; vehicle: Vehicle }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const SYNTH_API = 'https://techpulse-api.onrender.com';

  const handleShare = async () => {
    setState('working'); setErrMsg('');
    try {
      const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('synth-session-id') || '') : '';
      if (!sessionId) { setErrMsg('No session found.'); setState('error'); return; }
      const t1 = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';
      // 1) Ensure the report exists server-side (save is idempotent enough for our purpose)
      await fetch(`${SYNTH_API}/api/save-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t1 },
        body: JSON.stringify({
          pdf_base64: synthReport.pdf_base64,
          filename: synthReport.pdf_filename || 'TechPulse_Report.pdf',
          year: vehicle.year || '', make: vehicle.make || '', model: vehicle.model || '',
          session_id: sessionId,
          email: useAuthStore.getState().user?.email || '',
        }),
      }).catch(() => {});
      // 2) Mint the share token using the USER's Supabase JWT (not the T1 token)
      const userToken = useAuthStore.getState().token || '';
      const res = await fetch(`${SYNTH_API}/api/reports/${encodeURIComponent(sessionId)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
        body: JSON.stringify({ expires_days: 60 }),
      });
      if (!res.ok) {
        if (res.status === 401) setErrMsg('Please sign in again to share.');
        else if (res.status === 403) setErrMsg('You can only share reports from your own shop.');
        else if (res.status === 404) setErrMsg('Report not found yet — try downloading it first.');
        else setErrMsg('Could not create share link.');
        setState('error'); return;
      }
      const data = await res.json();
      setShareUrl(data.share_url || '');
      setState('done');
    } catch {
      setErrMsg('Something went wrong creating the link.');
      setState('error');
    }
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (state === 'done') {
    return (
      <div style={{ padding:'14px 16px', borderRadius:11, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#10b981', marginBottom:8 }}>Share link ready</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()}
            style={{ flex:1, padding:'9px 12px', borderRadius:8, border:'1px solid var(--border-card)', background:'var(--bg-input)', color:'var(--text-1)', fontSize:13 }} />
          <button onClick={copyLink}
            style={{ padding:'9px 16px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8 }}>Send this to the customer. It opens a read-only report, no login needed, and expires in 60 days.</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:12 }}>
      <button
        onClick={handleShare}
        disabled={state === 'working'}
        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px',
          borderRadius:11, border:'1px solid var(--border-card)', background:'var(--bg-card)',
          color:'var(--text-1)', fontWeight:700, fontSize:14, cursor: state==='working'?'wait':'pointer', width:'100%' }}>
        <Send size={15} /> {state === 'working' ? 'Creating link...' : 'Share with Customer'}
      </button>
      {state === 'error' && <div style={{ fontSize:12, color:'#ef4444', marginTop:6 }}>{errMsg}</div>}
    </div>
  );
}

function ReportStep({ synthReport, vehicle, codes, onFeedback, onBack }:
  { synthReport: SynthReport; vehicle: Vehicle; codes: DtcCode[]; onFeedback: () => void; onBack: () => void }
) {
  // The PDF Synth produced IS the report body. Render it inline + offer download.
  // No client-side text fabrication, no chat-text echoing.
  const pdfUrl = useMemo(() => {
    if (!synthReport.pdf_base64) return '';
    try {
      const bytes = Uint8Array.from(atob(synthReport.pdf_base64), c => c.charCodeAt(0));
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    } catch {
      return '';
    }
  }, [synthReport.pdf_base64]);
  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const downloadPdf = () => {
    if (!synthReport.pdf_base64) return;
    const bytes = Uint8Array.from(atob(synthReport.pdf_base64), (c: string) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = synthReport.pdf_filename || 'TechPulse_Report.pdf';
    a.click();
    URL.revokeObjectURL(url);
    // Persist a copy server-side (best effort, fire-and-forget)
    const token = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';
    fetch('https://techpulse-api.onrender.com/api/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        pdf_base64: synthReport.pdf_base64,
        filename: synthReport.pdf_filename || 'TechPulse_Report.pdf',
        year: vehicle.year || '', make: vehicle.make || '', model: vehicle.model || '',
        session_id: typeof window !== 'undefined' ? (localStorage.getItem('synth-session-id') || '') : '',
        email: useAuthStore.getState().user?.email || '',
      }),
    }).catch(() => {});
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:780 }}>
        <div style={{ padding:'20px 24px', borderRadius:16, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#00c3ff,#0055ff)', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={17} color='#fff' /></div>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-1)' }}>TechPulse Diagnostic Report</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
              </div>
            </div>
            {synthReport.confidence > 0 && (
              <div style={{ padding:'5px 14px', borderRadius:20, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', fontSize:12, fontWeight:700, color:'#10b981' }}>
                {synthReport.confidence}% Confidence
              </div>
            )}
          </div>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-feed)', border:'1px solid var(--border-card)' }}>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:4 }}>Vehicle</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>
              {vehicle.year && vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine?'  '+vehicle.engine:''}` : `VIN: ${vehicle.vin}`}
            </div>
          </div>
        </div>

        {codes.length > 0 && (
          <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14} color='#f59e0b' /> FAULT CODES</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {codes.map((c,i) => (
                <div key={i} style={{ padding:'6px 14px', borderRadius:8, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)' }}>
                  <span style={{ fontWeight:800, color:'#f59e0b', fontSize:13 }}>{c.code}</span>
                  {c.description && <span style={{ color:'var(--text-2)', fontSize:12, marginLeft:6 }}>{c.description}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The PDF Synth produced IS the report body. Embed inline. */}
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title='TechPulse Diagnostic Report'
            style={{ width:'100%', height:'70vh', border:'1px solid var(--border-card)', borderRadius:14, marginBottom:14, background:'#fff' }}
          />
        ) : (
          <div style={{ padding:'24px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
            Report unavailable -- please return to the diagnosis and continue with Synth.
          </div>
        )}

        {synthReport.pdf_base64 && (
          <button
            onClick={downloadPdf}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 20px',
              borderRadius:11, border:'none', background:'linear-gradient(135deg,#1B4F8A,#2E75B6)',
              color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', marginBottom:12, width:'100%' }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
            </svg>
            Download PDF Report
          </button>
        )}

        {synthReport.pdf_base64 && (
          <ShareWithCustomer synthReport={synthReport} vehicle={vehicle} />
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={{ padding:'12px 18px', borderRadius:12, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-2)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><ChevronLeft size={16} /> Back</button>
          <button onClick={onFeedback} style={{ flex:1, padding:'13px', borderRadius:12, background:'linear-gradient(135deg,#00c3ff,#0055ff)', border:'none', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>Confirm & Rate <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function FeedbackStep({ onRestart, unid, vehicle, codes, complaint, diagnosis, messages, token }: {
  onRestart: () => void;
  unid: string;
  vehicle: Vehicle;
  codes: DtcCode[];
  complaint: string;
  diagnosis: string;
  messages: Message[];
  token: string;
}) {
  const [rating, setRating] = useState<'accurate'|'partial'|'inaccurate'|null>(null);
  const [repaired, setRepaired] = useState<boolean|null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unconfirmOpen, setUnconfirmOpen] = useState(false);

  // Map fault codes to string[] for the API payloads
  const dtcStrings = codes.map(c => c.code).filter(Boolean);

  // Modals expect ChatMessage[] (role: 'user' | 'assistant' | 'system').
  // This page's Message uses 'synth' for the AI; map it to 'assistant'.
  const chatMessagesForModal = messages.map(m => ({
    role: (m.role === 'synth' ? 'assistant' : 'user') as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // Accurate/Partial -> Confirm modal; Inaccurate -> Unconfirm modal.
  const handleSubmit = () => {
    track({ event_type: 'feedback_submitted', step: 'feedback', session_id: unid, vehicle: [vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(' '), dtc_codes: dtcStrings, payload: { accuracy: rating, repaired } });
    if (rating === 'inaccurate') { setUnconfirmOpen(true); return; }
    if (rating === 'accurate' || rating === 'partial') { setConfirmOpen(true); return; }
    // No rating (only reachable when repaired === false): just close out.
    setSubmitted(true);
  };

  const handleModalSuccess = () => {
    setConfirmOpen(false);
    setUnconfirmOpen(false);
    setSubmitted(true);
  };
  if (submitted) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}><CheckCircle size={36} color='#10b981' /></div>
      <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 10px', textAlign:'center' }}>Diagnosis Complete</h2>
      <p style={{ fontSize:15, color:'var(--text-2)', textAlign:'center', maxWidth:400, lineHeight:1.6, marginBottom:28 }}>Thank you. Your feedback helps Synth improve for every technician.</p>
      <button onClick={onRestart} style={{ padding:'13px 32px', borderRadius:12, background:'linear-gradient(135deg,#00c3ff,#0055ff)', color:'#fff', fontSize:15, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}><RotateCcw size={17} /> New Diagnosis</button>
    </div>
  );
  const ratingOpts = [
    { id:'accurate' as const, label:'Accurate', icon:ThumbsUp, color:'#10b981', bg:'rgba(16,185,129,0.12)' },
    { id:'partial' as const, label:'Partial', icon:AlertTriangle, color:'#f59e0b', bg:'rgba(245,158,11,0.12)' },
    { id:'inaccurate' as const, label:'Inaccurate', icon:ThumbsDown, color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
  ];
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:520 }}>
        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 6px' }}>Confirm Diagnosis</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:0 }}>Help Synth learn by rating the accuracy of this diagnosis.</p>
        </div>
        {repaired !== false && (
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:12 }}>How accurate was the diagnosis?</label>
          <div style={{ display:'flex', gap:10 }}>
            {ratingOpts.map(({ id, label, icon:Icon, color, bg }) => (
              <button key={id} onClick={() => setRating(id)} style={{ flex:1, padding:'14px 10px', borderRadius:12, cursor:'pointer', background: rating===id ? bg : 'var(--bg-input)', border:`1px solid ${rating===id ? color : 'var(--border-input)'}`, display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all 0.15s' }}>
                <Icon size={20} color={rating===id ? color : 'var(--text-3)'} />
                <span style={{ fontSize:12, fontWeight:600, color: rating===id ? color : 'var(--text-2)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
        )}
        <div style={{ marginBottom:28 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:12 }}>Was the vehicle repaired?</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:true,label:'Yes  Fixed'},{v:false,label:'Not Yet'}].map(({v,label}) => (
              <button key={String(v)} onClick={() => setRepaired(v)} style={{ flex:1, padding:'12px', borderRadius:12, cursor:'pointer', background: repaired===v ? (v?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)') : 'var(--bg-input)', border: repaired===v ? `1px solid ${v?'#10b981':'#f59e0b'}` : '1px solid var(--border-input)', color: repaired===v ? (v?'#10b981':'#f59e0b') : 'var(--text-2)', fontSize:13, fontWeight:600, transition:'all 0.15s' }}>{label}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} disabled={repaired===null||(repaired===true&&!rating)}
          style={{ width:'100%', padding:'14px', borderRadius:12, background: repaired!==null&&(repaired===false||rating)?'linear-gradient(135deg,#00c3ff,#0055ff)':'var(--bg-input)', color: rating&&repaired!==null?'#fff':'var(--text-3)', fontSize:15, fontWeight:700, border:'none', cursor: rating&&repaired!==null?'pointer':'not-allowed' }}>
          Submit Feedback
        </button>

        <ConfirmFixModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onSuccess={handleModalSuccess}
          unid={unid}
          year={vehicle.year ? parseInt(vehicle.year, 10) : 0}
          make={vehicle.make}
          model={vehicle.model}
          dtc_codes={dtcStrings}
          complaint={complaint}
          diagnosis={diagnosis}
          messages={chatMessagesForModal}
          token={token}
        />
        <UnconfirmFixModal
          open={unconfirmOpen}
          onClose={() => setUnconfirmOpen(false)}
          onSuccess={handleModalSuccess}
          unid={unid}
          year={vehicle.year ? parseInt(vehicle.year, 10) : 0}
          make={vehicle.make}
          model={vehicle.model}
          dtc_codes={dtcStrings}
          complaint={complaint}
          messages={chatMessagesForModal}
          token={token}
        />
      </div>
    </div>
  );
}

function ChatPageInner() {
  const { user } = useAuthStore();
  const isDemoUser = DEMO_USER_EMAILS.includes(((user as { email?: string } | null)?.email || '').toLowerCase());
  // Pre-warm Synth API immediately on demo-user login so the chat step doesn't
  // pay the ~30-60s Render cold-start. Fires once per ChatPage mount.
  useEffect(() => {
    if (isDemoUser) {
      fetch(`${SYNTH_API}/health`, { method: 'GET' }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoUser]);
  const [step, setStep] = useState<Step>('vin');
  const [vehicle, setVehicle] = useState<Vehicle>({ year:'', make:'', model:'', engine:'', mileage:'', vin:'' });
  const [uploadedReport, setUploadedReport] = useState<string|undefined>();
  const [fileName, setFileName] = useState<string|undefined>();
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string>('');
  const [codes, setCodes] = useState<DtcCode[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [synthReport, setSynthReport] = useState<SynthReport|null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionUnid());

  // === Funnel tracking ===
  // Upsert a chat_sessions row keyed on session_id as the customer moves through
  // the flow, so we can measure started -> finished. Written at step 1 (vehicle)
  // and updated on each transition. Keyed on user_id (owner RLS policy), so it
  // persists with or without a shop. Fire-and-forget; never blocks the UI.
  const recordStep = useCallback(async (
    lastStep: 'vehicle' | 'codes' | 'diagnose' | 'report',
    extra?: { vehicle?: Vehicle; codes?: DtcCode[]; messages?: Message[] }
  ) => {
    try {
      if (!SUPABASE_ANON_KEY || isDemoUser) return;
      const _tok = useAuthStore.getState().token || '';
      if (!_tok) return;
      let _selfId = '';
      try { _selfId = JSON.parse(atob(_tok.split('.')[1] || '')).sub || ''; } catch { return; }
      if (!_selfId) return;
      const _u = user as { email?: string } | null;
      const _v = extra?.vehicle || vehicle;
      const _label = [_v.year, _v.make, _v.model].filter(Boolean).join(' ') || 'Diagnostic';
      const _codesArr = (extra?.codes || codes || []).map((c) => (c && c.code) || '').filter(Boolean);
      await fetch(SUPABASE_URL + '/rest/v1/chat_sessions?on_conflict=session_id', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + _tok,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id: _selfId,
          user_email: (_u && _u.email) || '',
          session_id: sessionId,
          title: _label + (_codesArr.length ? ' — ' + _codesArr.join(', ') : ''),
          dtc_codes: _codesArr,
          vehicle_context: _v,
          messages: extra?.messages || chatMessages || [],
          last_step: lastStep,
        }),
      });
    } catch { /* funnel write is best-effort */ }
  }, [sessionId, isDemoUser, user, vehicle, codes, chatMessages]);

  // === Rehydrate a past session from ?session=<id> (shop-wide history switcher) ===
  // Loads vehicle + messages from chat_sessions and drops the user into the chat step
  // to review/continue. We land on 'chat' (not 'report') because the stored session has
  // messages + vehicle but not the report PDF, which the report step requires.
  const searchParams = useSearchParams();
  const _loadId = searchParams.get('session');
  useEffect(() => {
    if (!_loadId) return;
    let cancelled = false;
    (async () => {
      const sess = await loadSession(_loadId);
      if (cancelled || !sess) return;
      if (sess.vehicle_context) setVehicle(sess.vehicle_context as unknown as Vehicle);
      if (Array.isArray(sess.dtc_codes)) {
        setCodes(
          sess.dtc_codes.length
            ? (sess.dtc_codes as string[]).map((c) => ({ code: c, description: '' }))
            : []
        );
      }
      if (Array.isArray(sess.messages)) setChatMessages(sess.messages as unknown as Message[]);
      // Make the loaded session canonical so re-saves upsert the same row + Synth memory aligns.
      setSessionId(sess.session_id);
      if (typeof window !== 'undefined') localStorage.setItem('synth-session-id', sess.session_id);
      setStep('chat');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_loadId]);

  // === Persist on report completion (direct to shared Supabase) ===
  // When synthReport becomes available, fire HTML upload + case insert directly
  // against the shared Supabase. Fire-and-forget; never blocks UI.
  useEffect(() => {
    if (!synthReport) return;
    if (!SUPABASE_ANON_KEY) return;
    (async () => {
    try {
      const _u = user as { email?: string; businessName?: string } | null;
      const _shopName = (_u && _u.businessName) ? _u.businessName : '';
      // Resolve shop_id once (preferred shop key). Used by both the case-study
      // insert (#2) and the chat_sessions upsert (#3).
      let _shopId: string | null = (_u as any)?.shop_id || null;
      let _selfId = '';
      try {
        const _tok0 = useAuthStore.getState().token || '';
        _selfId = JSON.parse(atob(_tok0.split('.')[1] || '')).sub || '';
        if (!_shopId && _selfId) {
          // Onboarding writes shop_id to `users`; older flow used `user_profiles`.
          // Check both so we attach the shop when it exists.
          const _pr0 = await fetch(
            SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(_selfId) + '&select=shop_id',
            { headers: { Authorization: 'Bearer ' + (useAuthStore.getState().token || SUPABASE_ANON_KEY), apikey: SUPABASE_ANON_KEY } }
          );
          if (_pr0.ok) { const _r0 = await _pr0.json(); _shopId = (_r0 && _r0[0] && _r0[0].shop_id) || null; }
          if (!_shopId) {
            const _pr1 = await fetch(
              SUPABASE_URL + '/rest/v1/user_profiles?id=eq.' + encodeURIComponent(_selfId) + '&select=shop_id',
              { headers: { Authorization: 'Bearer ' + (useAuthStore.getState().token || SUPABASE_ANON_KEY), apikey: SUPABASE_ANON_KEY } }
            );
            if (_pr1.ok) { const _r1 = await _pr1.json(); _shopId = (_r1 && _r1[0] && _r1[0].shop_id) || null; }
          }
        }
      } catch { /* best effort */ }
      const _unid = sessionId;
      const _vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
      const _codesArr: string[] = (codes || []).map((c: DtcCode) => (c && c.code) || '').filter(Boolean);
      const _conversationText = (chatMessages || [])
        .map((m: Message) => (m.role === 'user' ? 'TECH' : 'SYNTH') + ': ' + (m.content || ''))
        .join('\n\n');
      const _diagnosisText = _conversationText.slice(-3000);
      const _reportFilename = _unid + ' - ' + _vehicleLabel + ' - Diagnostic Report.html';
      const _htmlContent = buildDiagnosticHtmlReport({
        unid: _unid,
        vehicle,
        codes: _codesArr,
        complaint: symptoms || '',
        diagnosis: _diagnosisText,
        messages: chatMessages || [],
        shopName: _shopName,
      });
      // Sanitize shop_name for use in storage path (no slashes, no leading/trailing whitespace).
      const _shopFolder = (_shopName || 'unknown')
        .replace(/[\\\/]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim() || 'unknown';
      const _objectPath = encodeURIComponent(_shopFolder) + '/' + encodeURIComponent(_unid) + '/' + encodeURIComponent(_reportFilename);
      const _userToken = useAuthStore.getState().token || SUPABASE_ANON_KEY;

      // 1) Upload HTML report to the diagnostic-reports storage bucket.
      fetch(SUPABASE_URL + '/storage/v1/object/diagnostic-reports/' + _objectPath, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + _userToken,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'text/html',
          'x-upsert': 'true',
        },
        body: _htmlContent,
      }).then((r) => {
        if (!r.ok) console.error('[report] storage upload failed', r.status);
      }).catch((e) => console.error('[report] storage upload error', e));

      // 2) Insert case row into diagnostic_case_studies.
      fetch(SUPABASE_URL + '/rest/v1/diagnostic_case_studies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + _userToken,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          unid: _unid,
          source: isDemoUser ? 'demo' : 'web',
          synth_guided: false,             // Gate: unverified web write — invisible to Synth
          diagnosis_outcome: 'pending_review',  // Override default 'confirmed_correct' — these are NOT verified
          messages: chatMessages || [],
          title: _vehicleLabel + (_codesArr.length ? ' — ' + _codesArr.join(', ') : ''),  // NOT NULL
          year: vehicle.year ? (parseInt(vehicle.year, 10) || null) : null,  // schema is integer
          make: vehicle.make || '',
          model: vehicle.model || '',
          engine: vehicle.engine || '',
          vin: vehicle.vin || '',
          dtc_codes: _codesArr,
          complaint: symptoms || '',
          symptoms: symptoms || '',        // Mike's q_cases checks both columns
          diagnosis: _diagnosisText,
          fix: '',
          conclusion: '',
          shop_name: _shopName || '',
          shop_id: _shopId,                // Prefer FK; shop_name kept for back-compat
          created_by: _selfId,             // Owner — lets RLS persist even without a shop
          full_content: (isDemoUser ? null : (_diagnosisText && _diagnosisText.length > 50 ? _diagnosisText : null)), // Trial-gate count marker for live web scans. Stays out of Synth training/search (synth_guided=false, embedding=null); promotion is gated on embedding, not this field.
          embedding: null,                 // Gate: generated on promotion only
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const _b = await r.text().catch(() => '');
          console.error('[report] case_studies insert failed', r.status, _b);
        }
      }).catch((e) => { console.error('[report] case_studies insert error', e); });

      // 2b) Save the structured synthesis fields to diagnostic_reports (Mike's
      //     decision: synthesis-prompt path). Upsert on session_id. Only fires
      //     when Synth emitted a parseable REPORT_FINAL marker; degrades to a
      //     no-op otherwise (e.g. while the model-string 404 persists), so it
      //     never blocks the case-study write or the PDF.
      try {
        const _syn = (synthReport && synthReport.synthesis) ? synthReport.synthesis as Record<string, any> : null;
        if (_syn) {
          const _num = (v: any) => {
            if (typeof v === 'number') return v;
            if (typeof v === 'string') { const n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; }
            return null;
          };
          const _str = (v: any) => {
            if (v == null) return null;
            if (typeof v === 'string') return v;
            if (Array.isArray(v)) return v.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n');
            return JSON.stringify(v);
          };
          fetch(SUPABASE_URL + '/rest/v1/diagnostic_reports?on_conflict=session_id', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + _userToken,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({
              session_id: _unid,
              shop_id: _shopId,
              vehicle_info: _vehicleLabel,
              vehicle_year: vehicle.year || null,
              vehicle_make: vehicle.make || null,
              vehicle_model: vehicle.model || null,
              dtc_codes: _codesArr,
              symptoms: symptoms || null,
              // Structured synthesis fields (Mike's named keys), tolerant of
              // either his exact names or close variants in the JSON.
              findings: _str(_syn.findings),
              root_cause: _str(_syn.root_cause ?? _syn.rootCause),
              recommendation: _str(_syn.recommendation ?? _syn.resolution),
              critical_findings: _str(_syn.critical_findings ?? _syn.criticalFindings),
              cost_savings: _num(_syn.cost_savings ?? _syn.costSavings ?? _syn.cost_saved),
              diagnosis: _str(_syn.diagnosis) ?? _diagnosisText,
              status: 'generated',
            }),
          }).then(async (r) => {
            if (!r.ok) {
              const _b = await r.text().catch(() => '');
              console.error('[report] diagnostic_reports save failed', r.status, _b);
            }
          }).catch((e) => console.error('[report] diagnostic_reports save error', e));
        }
      } catch (e) { console.error('[report] synthesis save error', e); }

      // 3) Upsert a diagnostic session row for history (Recent Diagnostics).
      //    Keyed on the user (user_id), so it persists even before a shop is
      //    assigned; shop_id is included when known for shop-wide history.
      try {
          if (!_selfId) return;
          let _email = (_u && _u.email) || '';
          try {
            const _emRes = await fetch(
              SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(_selfId) + '&select=email',
              { headers: { 'Authorization': 'Bearer ' + _userToken, 'apikey': SUPABASE_ANON_KEY } }
            );
            if (_emRes.ok) { const _er = await _emRes.json(); _email = (_er && _er[0] && _er[0].email) || _email; }
          } catch { /* email is best-effort */ }
          const _csRes = await fetch(SUPABASE_URL + '/rest/v1/chat_sessions?on_conflict=session_id', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + _userToken,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({
              user_id: _selfId,
              user_email: _email,
              shop_id: _shopId,
              session_id: _unid,
              title: _vehicleLabel + (_codesArr.length ? ' — ' + _codesArr.join(', ') : ''),
              dtc_codes: _codesArr,
              vehicle_context: vehicle,
              messages: chatMessages || [],
              last_step: 'report',
            }),
          });
          if (!_csRes.ok) console.error('[report] chat_sessions upsert failed', _csRes.status, await _csRes.text().catch(() => ''));
      } catch (e) { console.error('[report] chat_sessions upsert error', e); }
    } catch { /* never let persistence errors break the report flow */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synthReport]);
  // === Free-scan trial gate ===
  // Before starting a new scan (codes -> chat), check whether this shop has
  // used up its free successful scans. Exempt shops (manually billed, comped,
  // or paid) always pass. Demo users always pass. Only blocks NEW scans; never
  // interrupts a session already in progress or a rehydrated past session.
  const [gateBlocked, setGateBlocked] = useState(false);
  const [gateChecking, setGateChecking] = useState(false);
  const [gateInfo, setGateInfo] = useState<{ count: number; limit: number } | null>(null);

  const resolveShopId = useCallback(async (): Promise<string | null> => {
    try {
      const _tok = useAuthStore.getState().token || '';
      const _u = user as { shop_id?: string } | null;
      let _shopId: string | null = (_u && _u.shop_id) || null;
      if (_shopId) return _shopId;
      let _selfId = '';
      try { _selfId = JSON.parse(atob((_tok.split('.')[1]) || '')).sub || ''; } catch { return null; }
      if (!_selfId || !SUPABASE_ANON_KEY) return null;
      const _r = await fetch(
        SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(_selfId) + '&select=shop_id',
        { headers: { Authorization: 'Bearer ' + (_tok || SUPABASE_ANON_KEY), apikey: SUPABASE_ANON_KEY } }
      );
      if (_r.ok) { const _j = await _r.json(); _shopId = (_j && _j[0] && _j[0].shop_id) || null; }
      return _shopId;
    } catch { return null; }
  }, [user]);

  // Returns true if the scan may proceed, false if blocked (paywall shown).
  const checkGateThenStart = useCallback(async (onAllowed: () => void) => {
    // Demo users bypass entirely.
    if (isDemoUser) { onAllowed(); return; }
    if (!SUPABASE_ANON_KEY) { onAllowed(); return; }  // can't check -> fail open
    setGateChecking(true);
    try {
      const _shopId = await resolveShopId();
      // No shop resolved -> can't attribute scans -> fail open (don't block real users).
      if (!_shopId) { onAllowed(); return; }
      const _tok = useAuthStore.getState().token || SUPABASE_ANON_KEY;
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/shop_scan_gate_status', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + _tok, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_shop_id: _shopId }),
      });
      if (!res.ok) { onAllowed(); return; }  // gate error -> fail open
      const j = await res.json();
      const row = Array.isArray(j) ? j[0] : j;
      if (row && row.blocked === true) {
        setGateInfo({ count: row.scan_count ?? 0, limit: row.scan_limit ?? 3 });
        setGateBlocked(true);
        return;  // do NOT call onAllowed
      }
      onAllowed();
    } catch {
      onAllowed();  // any failure -> fail open, never trap a real user
    } finally {
      setGateChecking(false);
    }
  }, [isDemoUser, resolveShopId]);

  if (!user) return null;
  const restart = () => {
    setStep('vin'); setVehicle({ year:'', make:'', model:'', engine:'', mileage:'', vin:'' });
    setUploadedReport(undefined); setFileName(undefined); setUploadedPdfBase64('');
    setCodes([]); setSymptoms(''); setSynthReport(null); setChatMessages([]);
    localStorage.removeItem('synth-session-id');
  };
  return (
    <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-page)' }}>
      <StepBar step={step} />
      {gateChecking && (
        <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.6)', zIndex:40 }}>
          <div style={{ fontSize:14, color:'var(--text-secondary, #555)' }}>Checking…</div>
        </div>
      )}
      {gateBlocked && (
        <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.55)', zIndex:50, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, maxWidth:440, width:'100%', padding:'28px 26px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:'#0f172a', marginBottom:8 }}>You&apos;ve used your free diagnostics</div>
            <p style={{ fontSize:14, lineHeight:1.5, color:'#475569', marginBottom:20 }}>
              Your shop has completed all {gateInfo?.limit ?? 3} free diagnostic scans. Subscribe to keep running unlimited diagnostics with Synth.
            </p>
            <button
              onClick={() => { window.location.href = '/app/billing'; }}
              style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'none', background:'#2563eb', color:'#fff', fontWeight:600, fontSize:15, cursor:'pointer', marginBottom:10 }}>
              Subscribe to continue
            </button>
            <button
              onClick={() => { setGateBlocked(false); setStep('vin'); }}
              style={{ width:'100%', padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:500, fontSize:14, cursor:'pointer' }}>
              Not now
            </button>
          </div>
        </div>
      )}
      {step==='vin'      && <VinStep initialVehicle={isDemoUser ? DEMO_VEHICLE : undefined} onNext={(v,r,fn,b64) => { setVehicle(v); setUploadedReport(r); setFileName(fn); setUploadedPdfBase64(b64||''); recordStep('vehicle', { vehicle: v }); track({ event_type: 'scan_started', step: 'vin', session_id: sessionId, vehicle: [v.year,v.make,v.model].filter(Boolean).join(' '), payload: { has_pdf: !!b64 } }); if (b64) track({ event_type: 'pdf_uploaded', step: 'vin', session_id: sessionId, payload: { file: fn } }); setStep('codes'); }} />}
      {step==='codes'    && <CodesStep vehicle={vehicle} uploadedReport={uploadedReport} fileName={fileName} initialCodes={isDemoUser ? DEMO_CODES : undefined} initialSymptoms={isDemoUser ? DEMO_SYMPTOMS : undefined} onNext={(c,s) => { setCodes(c); setSymptoms(s); recordStep('codes', { codes: c }); track({ event_type: 'codes_entered', step: 'codes', session_id: sessionId, dtc_codes: (c||[]).map(x => x?.code).filter(Boolean), payload: { symptom_len: (s||'').length } }); checkGateThenStart(() => setStep('chat')); }} onBack={() => setStep('vin')} />}
      {step==='chat'     && <ChatStep vehicle={vehicle} codes={codes} symptoms={symptoms} uploadedReport={uploadedReport} pdfBase64={uploadedPdfBase64} fileName={fileName} sessionId={sessionId} isDemo={isDemoUser} initialMessages={chatMessages} onReport={(r, msgs, updated) => { setSynthReport(r); setChatMessages(msgs); if (updated) setVehicle(updated); recordStep('report', { messages: msgs, vehicle: updated || vehicle }); track({ event_type: 'report_generated', step: 'report', session_id: sessionId, vehicle: [(updated||vehicle).year,(updated||vehicle).make,(updated||vehicle).model].filter(Boolean).join(' ') }); setStep('report'); }} onBack={() => setStep('codes')} />}
      {step==='report'   && synthReport && <ReportStep synthReport={synthReport} vehicle={vehicle} codes={codes} onFeedback={() => setStep('feedback')} onBack={() => setStep('chat')} />}
      {step==='feedback' && <FeedbackStep
        onRestart={restart}
        unid={sessionId}
        vehicle={vehicle}
        codes={codes}
        complaint={symptoms}
        diagnosis={(chatMessages.filter(m => m.role === 'synth').pop()?.content) || ''}
        messages={chatMessages}
        token={API_TOKEN}
      />}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
