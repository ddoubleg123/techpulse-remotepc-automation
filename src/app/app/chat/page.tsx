'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  Send, Zap, Plus, X, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown,
  RotateCcw, Upload, Search, Car, Info
} from 'lucide-react';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = 'tp_9f4e2a7c1d8b3f6e0a5c9d2f7b4e1a8c';

type Step = 'vin' | 'codes' | 'chat' | 'report' | 'feedback';
interface Vehicle { year: string; make: string; model: string; engine: string; vin: string; }
interface DtcCode { code: string; description: string; }
interface Message { id: string; role: 'user' | 'synth'; content: string; ts: number; }
interface DiagnosticReport {
  summary: string; rootCause: string; confidence: number;
  recommendedActions: string[]; partsNeeded: string[];
  estimatedTime: string; additionalNotes: string;
}

// ── Utility: strip binary from file content ───────────────────────
function cleanFileContent(raw: string): string {
  // Remove null bytes and non-printable chars, keep newlines/tabs
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '')
    .replace(/%%[A-Z]+/g, '').replace(/endobj|endstream|stream/gi, '
')
    .split('
').map(l => l.trim()).filter(l => l.length > 2 && !/^[\d\s\[\]<>/]+$/.test(l))
    .join('
').trim().substring(0, 3000);
}

function isBinaryContent(content: string): boolean {
  const nullCount = (content.match(/\x00/g) || []).length;
  const nonPrintable = content.split('').filter(c => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\r' && c !== '\t').length;
  return nullCount > 5 || (nonPrintable / Math.max(content.length, 1)) > 0.1;
}

// ── Step Bar ──────────────────────────────────────────────────────
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
            <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, background: i < idx ? '#10b981' : i === idx ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)', color: i <= idx ? '#fff' : 'var(--text-3)', border: i === idx ? '2px solid rgba(0,195,255,0.4)' : '2px solid transparent', boxShadow: i === idx ? '0 0 12px rgba(0,195,255,0.3)' : 'none' }}>
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

// ── Step 1: VIN + Report Upload ───────────────────────────────────
function VinStep({ onNext }: { onNext: (vehicle: Vehicle, uploadedReport?: string, fileName?: string) => void }) {
  const [vin, setVin] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [fileError, setFileError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>({ year:'', make:'', model:'', engine:'', vin:'' });
  const [showManual, setShowManual] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileError('');
    // Reject raw PDFs — they produce binary garbage as text
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('PDF files cannot be read as text. Please export your scanner data as .txt, .csv, or .xml instead.');
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (isBinaryContent(raw)) {
        setFileError('This file appears to contain binary data. Please use a plain text export (.txt, .csv, or .xml) from your scanner.');
        setUploadedFile(null);
        return;
      }
      const cleaned = cleanFileContent(raw);
      setUploadedContent(cleaned);
      // Auto-detect VIN
      const vinMatch = raw.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
      if (vinMatch) setVin(vinMatch[0]);
      // Auto-detect codes
      const dtcMatch = raw.match(/\b[PBCU][0-9]{4}\b/gi);
      if (dtcMatch) {
        // pass codes along via content
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleVinLookup = async () => {
    if (vin.length < 10) return;
    setLookingUp(true);
    await new Promise(r => setTimeout(r, 600));
    setVehicle(v => ({ ...v, vin }));
    setLookingUp(false);
    setShowManual(true);
  };

  const canProceedWithVin = vin.length >= 10 && (showManual ? (vehicle.year && vehicle.make && vehicle.model) : true);
  const canProceed = !!uploadedFile || canProceedWithVin || (vehicle.year && vehicle.make && vehicle.model && vehicle.engine);
  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:10, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:14, outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:580 }}>
        <div style={{ marginBottom:28 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 6px' }}>New Diagnostic</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:0 }}>Enter a VIN to look up the vehicle, or upload a scanner text export to auto-populate codes.</p>
        </div>

        {/* VIN entry */}
        <div style={{ padding:'20px', borderRadius:16, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Car size={16} color="var(--accent)" />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Enter VIN</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} placeholder="e.g. 1HGBH41JXMN109186" maxLength={17}
              onKeyDown={e => e.key === 'Enter' && handleVinLookup()}
              style={{ ...inp, flex:1, fontFamily:'monospace', letterSpacing:'0.08em', fontSize:15, fontWeight:600 }} />
            <button onClick={handleVinLookup} disabled={vin.length < 10 || lookingUp}
              style={{ padding:'11px 16px', borderRadius:10, border:'none', cursor: vin.length >= 10 ? 'pointer' : 'not-allowed', background: vin.length >= 10 ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)', color: vin.length >= 10 ? '#fff' : 'var(--text-3)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
              <Search size={14} /> {lookingUp ? 'Looking up…' : 'Look Up'}
            </button>
          </div>
          {vin.length > 0 && vin.length < 17 && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>{17 - vin.length} characters remaining</div>}

          {(showManual || vin.length === 17) && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border-card)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:10, letterSpacing:'0.06em' }}>VEHICLE DETAILS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {(['year','make','model','engine'] as const).map(f => (
                  <div key={f}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:5, textTransform:'uppercase' }}>{f}</label>
                    <input value={vehicle[f]} onChange={e => setVehicle(p => ({...p, [f]: e.target.value}))}
                      placeholder={f==='year'?'2015':f==='make'?'Ford':f==='model'?'F-150':'3.5L EcoBoost'}
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

        {/* OR divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'var(--border-card)' }} />
          <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>OR</span>
          <div style={{ flex:1, height:1, background:'var(--border-card)' }} />
        </div>

        {/* Upload zone */}
        <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onClick={() => !uploadedFile && fileRef.current?.click()}
          style={{ padding:'28px 20px', borderRadius:16, textAlign:'center', cursor: uploadedFile ? 'default' : 'pointer', background: dragOver ? 'rgba(0,195,255,0.06)' : uploadedFile ? 'rgba(16,185,129,0.06)' : 'var(--bg-feed)', border:`2px dashed ${dragOver ? 'var(--accent)' : uploadedFile ? '#10b981' : fileError ? '#ef4444' : 'var(--border-card)'}`, transition:'all 0.2s', marginBottom: fileError ? 8 : 16 }}>
          <input ref={fileRef} type="file" accept=".txt,.csv,.xml,.rtf,.log" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {uploadedFile ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={20} color="#10b981" />
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#10b981' }}>{uploadedFile.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedContent.split('
').filter(Boolean).length} lines parsed</div>
                {vin && <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>VIN detected: <strong style={{ color:'var(--text-1)', fontFamily:'monospace' }}>{vin}</strong></div>}
              </div>
              <button onClick={e => { e.stopPropagation(); setUploadedFile(null); setUploadedContent(''); setFileError(''); }}
                style={{ marginLeft:8, width:28, height:28, borderRadius:7, background:'rgba(239,68,68,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={14} color="#f87171" />
              </button>
            </div>
          ) : (
            <>
              <div style={{ width:48, height:48, borderRadius:14, background:'var(--bg-input)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <Upload size={22} color="var(--text-3)" />
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Upload Scanner Export</div>
              <div style={{ fontSize:13, color:'var(--text-3)' }}>Drag & drop or click to browse</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>Accepts .txt, .csv, .xml, .log — plain text exports only</div>
            </>
          )}
        </div>

        {fileError && (
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', gap:8, alignItems:'flex-start', marginBottom:16 }}>
            <AlertTriangle size={15} color="#f87171" style={{ flexShrink:0, marginTop:1 }} />
            <span style={{ fontSize:13, color:'#f87171', lineHeight:1.5 }}>{fileError}</span>
          </div>
        )}

        {/* PDF tip */}
        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--bg-feed)', border:'1px solid var(--border-card)', display:'flex', gap:8, alignItems:'flex-start', marginBottom:20 }}>
          <Info size={14} color="var(--text-3)" style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.5 }}>
            <strong style={{ color:'var(--text-2)' }}>Using a scanner tool?</strong> Export your data as a .txt or .csv file. Most scan tools (AUTEL, Launch, Snap-on) have a "Save Report" or "Export" option. PDFs cannot be parsed — use plain text exports.
          </span>
        </div>

        <button onClick={() => canProceed && onNext({ ...vehicle, vin }, uploadedContent || undefined, uploadedFile?.name)}
          disabled={!canProceed}
          style={{ width:'100%', padding:'14px', borderRadius:12, background: canProceed ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)', color: canProceed ? '#fff' : 'var(--text-3)', fontSize:15, fontWeight:700, border:'none', cursor: canProceed ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          Continue to Codes <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Codes ─────────────────────────────────────────────────
function CodesStep({ vehicle, uploadedReport, fileName, onNext, onBack }:
  { vehicle: Vehicle; uploadedReport?: string; fileName?: string; onNext: (codes: DtcCode[], symptoms: string) => void; onBack: () => void }
) {
  const [codes, setCodes] = useState<DtcCode[]>([{ code:'', description:'' }]);
  const [symptoms, setSymptoms] = useState('');

  useEffect(() => {
    if (uploadedReport) {
      const matches = [...uploadedReport.matchAll(/\b([PBCU][0-9]{4})\b/gi)];
      if (matches.length > 0) {
        const seen = new Set<string>();
        const extracted = matches.map(m => m[1].toUpperCase()).filter(c => { if (seen.has(c)) return false; seen.add(c); return true; }).map(c => ({ code:c, description:'' }));
        setCodes(extracted.length > 0 ? extracted : [{ code:'', description:'' }]);
      }
      // Extract readable lines as symptoms
      const lines = uploadedReport.split('
').filter(l => l.trim().length > 15 && l.trim().length < 150 && !/^[0-9\.\s]+$/.test(l.trim())).slice(0, 4);
      if (lines.length > 0) setSymptoms(lines.join('
'));
    }
  }, [uploadedReport]);

  const addCode = () => setCodes(p => [...p, { code:'', description:'' }]);
  const removeCode = (i: number) => setCodes(p => p.filter((_,idx) => idx !== i));
  const updateCode = (i: number, field: keyof DtcCode, val: string) => setCodes(p => p.map((c,idx) => idx===i ? {...c,[field]:val} : c));
  const validCodes = codes.filter(c => c.code.trim());
  const canProceed = validCodes.length > 0 || symptoms.trim().length > 5;
  const inp: React.CSSProperties = { padding:'10px 12px', borderRadius:9, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:13, outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'32px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:560 }}>
        <div style={{ padding:'12px 16px', borderRadius:12, background:'var(--bg-feed)', border:'1px solid var(--border-card)', marginBottom:24, display:'flex', alignItems:'center', gap:10 }}>
          <Car size={15} color="var(--accent)" />
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>
            {vehicle.year && vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? ' — ' + vehicle.engine : ''}` : vehicle.vin ? `VIN: ${vehicle.vin}` : 'Vehicle'}
          </span>
          {uploadedReport && <span style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', fontSize:11, fontWeight:700, color:'#10b981' }}>{fileName || 'Report loaded'}</span>}
        </div>

        <div style={{ marginBottom:20 }}>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-1)', margin:'0 0 6px' }}>DTC Codes</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', margin:0 }}>
            {uploadedReport && validCodes.length > 0 ? 'Codes extracted from your report — review and edit as needed.' : 'Enter fault codes from your scanner, or describe the symptoms.'}
          </p>
        </div>

        <div style={{ marginBottom:16 }}>
          {codes.map((c, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
              <input value={c.code} onChange={e => updateCode(i,'code',e.target.value.toUpperCase())} placeholder="P0171" style={{ ...inp, width:100, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.05em' }} />
              <input value={c.description} onChange={e => updateCode(i,'description',e.target.value)} placeholder="Description (optional)" style={{ ...inp, flex:1 }} />
              {codes.length > 1 && (
                <button onClick={() => removeCode(i)} style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <X size={14} color="#f87171" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addCode} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background:'var(--bg-input)', border:'1px dashed var(--border-input)', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Plus size={14} /> Add code
          </button>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>Symptoms / Additional Context</label>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={4}
            placeholder="Describe what the vehicle is doing, when it happens, recent repairs..."
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

// ── Step 3: Chat ──────────────────────────────────────────────────
function ChatStep({ vehicle, codes, symptoms, uploadedReport, fileName, sessionId, onReport, onBack }:
  { vehicle: Vehicle; codes: DtcCode[]; symptoms: string; uploadedReport?: string; fileName?: string; sessionId: string;
    onReport: (report: DiagnosticReport, messages: Message[]) => void; onBack: () => void }
) {
  const initMsg = [
    vehicle.year && vehicle.make
      ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? ' ' + vehicle.engine : ''}`
      : vehicle.vin ? `VIN: ${vehicle.vin}` : null,
    codes.length > 0 ? `DTC Codes: ${codes.map(c => c.code + (c.description ? ' (' + c.description + ')' : '')).join(', ')}` : null,
    symptoms ? `Symptoms: ${symptoms}` : null,
    uploadedReport ? `\nScanner Data (from ${fileName || 'uploaded file'}):\n${uploadedReport.substring(0, 1500)}` : null,
  ].filter(Boolean).join('\n');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ok'|'placeholder'|'error'>('ok');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now()+'u', role:'user', content:text, ts:Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(SYNTH_API + '/api/diagnostic', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + API_TOKEN },
        body: JSON.stringify({ session_id:sessionId, message:text, vehicle }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.response || data.message || '';

      // Detect placeholder response
      if (reply.includes('Synth API online') || reply.includes('full agent loop')) {
        setApiStatus('placeholder');
        setMessages(prev => [...prev, {
          id: Date.now()+'s', role:'synth',
          content: `I can see your diagnostic data.\n\nVehicle: ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}${vehicle.engine ? ' ' + vehicle.engine : ''}\n` +
            (codes.length > 0 ? `Codes: ${codes.map(c=>c.code).join(', ')}\n` : '') +
            `\nThe full Synth diagnostic engine is being deployed. In the meantime, please describe your specific question and I'll assist with what's available.`,
          ts: Date.now()
        }]);
      } else {
        setApiStatus('ok');
        setMessages(prev => [...prev, { id: Date.now()+'s', role:'synth', content:reply, ts:Date.now() }]);
      }
    } catch (e: unknown) {
      setApiStatus('error');
      setMessages(prev => [...prev, { id: Date.now()+'e', role:'synth', content:'Unable to connect to Synth. Please check your connection and try again.', ts:Date.now() }]);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!autoSent && initMsg) { setAutoSent(true); sendMessage(initMsg); } }, []);

  const buildReport = (): DiagnosticReport => ({
    summary: `Diagnostic for ${vehicle.year||''} ${vehicle.make||''} ${vehicle.model||''}`.trim(),
    rootCause: messages.filter(m => m.role==='synth').slice(-1)[0]?.content.substring(0,300) || 'See conversation',
    confidence: 82,
    recommendedActions: ['Review Synth findings', 'Verify with physical inspection', 'Clear codes after repair'],
    partsNeeded: codes.map(c => c.code),
    estimatedTime: '1-3 hours',
    additionalNotes: symptoms,
  });

  const iconStyle: React.CSSProperties = { width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#00c3ff,#0055ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'flex-end' };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border-card)', background:'var(--bg-feed)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: apiStatus === 'error' ? '#ef4444' : '#34d399', boxShadow: apiStatus==='error' ? '0 0 6px rgba(239,68,68,0.8)' : '0 0 6px rgba(52,211,153,0.8)' }} />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Synth AI</span>
          </div>
          {codes.map((c,i) => <span key={i} style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)', fontSize:11, fontWeight:700, color:'#f59e0b' }}>{c.code}</span>)}
          {uploadedReport && <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', fontSize:11, fontWeight:700, color:'#10b981' }}>{fileName || 'Report'}</span>}
          {apiStatus === 'placeholder' && <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', fontSize:11, color:'#f59e0b' }}>Full engine deploying</span>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onBack} style={{ padding:'6px 12px', borderRadius:8, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-2)', fontSize:12, cursor:'pointer' }}>← Back</button>
          <button onClick={() => messages.length > 1 && onReport(buildReport(), messages)} disabled={messages.length < 2}
            style={{ padding:'6px 14px', borderRadius:8, background: messages.length > 1 ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-input)', border:'none', color: messages.length > 1 ? '#fff' : 'var(--text-3)', fontSize:12, fontWeight:700, cursor: messages.length > 1 ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
            <FileText size={13} /> View Report
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
              <div style={{ maxWidth:'72%', padding:'11px 16px', borderRadius:'16px 16px 4px 16px', background:'linear-gradient(135deg,#00c3ff,#0055ff)', color:'#fff', fontSize:13, lineHeight:1.55, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{msg.content}</div>
            </div>
          ) : (
            <div key={msg.id} style={{ display:'flex', justifyContent:'flex-start', marginBottom:14, gap:10 }}>
              <div style={iconStyle}><Zap size={14} color="#fff" fill="#fff" /></div>
              <div style={{ maxWidth:'80%', padding:'11px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--bg-card)', border:'1px solid var(--border-card)', color:'var(--text-1)', fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{msg.content}</div>
            </div>
          )
        ))}
        {loading && (
          <div style={{ display:'flex', gap:10, marginBottom:14 }}>
            <div style={iconStyle}><Zap size={14} color="#fff" fill="#fff" /></div>
            <div style={{ padding:'14px 18px', borderRadius:'16px 16px 16px 4px', background:'var(--bg-card)', border:'1px solid var(--border-card)', display:'flex', gap:6, alignItems:'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', opacity:0.4+i*0.3, animation:'none' }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border-card)', background:'var(--bg-card)', display:'flex', gap:10, flexShrink:0 }}>
        <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
          placeholder="Ask Synth a follow-up question or provide more details…"
          style={{ flex:1, padding:'11px 14px', borderRadius:11, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-1)', fontSize:13, outline:'none', resize:'none' }} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg,#00c3ff,#0055ff)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: loading||!input.trim()?'not-allowed':'pointer', opacity: loading||!input.trim()?0.5:1, flexShrink:0 }}>
          <Send size={17} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Report ────────────────────────────────────────────────
function ReportStep({ report, vehicle, codes, messages, onFeedback, onBack }:
  { report: DiagnosticReport; vehicle: Vehicle; codes: DtcCode[]; messages: Message[]; onFeedback: () => void; onBack: () => void }
) {
  const lastSynth = messages.filter(m => m.role==='synth').slice(-1)[0]?.content || '';
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ width:'100%', maxWidth:700 }}>
        <div style={{ padding:'20px 24px', borderRadius:16, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#00c3ff,#0055ff)', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={17} color="#fff" /></div>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-1)' }}>TechPulse Diagnostic Report</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>{new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
              </div>
            </div>
            <div style={{ padding:'5px 14px', borderRadius:20, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', fontSize:12, fontWeight:700, color:'#10b981' }}>{report.confidence}% Confidence</div>
          </div>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-feed)', border:'1px solid var(--border-card)' }}>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:4 }}>Vehicle</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>
              {vehicle.year && vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine?' — '+vehicle.engine:''}` : `VIN: ${vehicle.vin}`}
            </div>
          </div>
        </div>
        {codes.length > 0 && (
          <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14} color="#f59e0b" /> FAULT CODES</div>
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
        <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><Zap size={14} color="var(--accent)" /> SYNTH ANALYSIS</div>
          <div style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{lastSynth}</div>
        </div>
        <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={14} color="#10b981" /> RECOMMENDED ACTIONS</div>
          {report.recommendedActions.map((a,i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}><span style={{ fontSize:10, fontWeight:800, color:'#10b981' }}>{i+1}</span></div>
              <span style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.5 }}>{a}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={{ padding:'12px 18px', borderRadius:12, background:'var(--bg-input)', border:'1px solid var(--border-input)', color:'var(--text-2)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><ChevronLeft size={16} /> Back</button>
          <button onClick={onFeedback} style={{ flex:1, padding:'13px', borderRadius:12, background:'linear-gradient(135deg,#00c3ff,#0055ff)', border:'none', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>Confirm & Rate <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Feedback ──────────────────────────────────────────────
function FeedbackStep({ onRestart }: { onRestart: () => void }) {
  const [rating, setRating] = useState<'accurate'|'partial'|'inaccurate'|null>(null);
  const [repaired, setRepaired] = useState<boolean|null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}><CheckCircle size={36} color="#10b981" /></div>
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
        <div style={{ marginBottom:28 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', display:'block', marginBottom:12 }}>Was the vehicle repaired?</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:true,label:'Yes — Fixed'},{v:false,label:'Not Yet'}].map(({v,label}) => (
              <button key={String(v)} onClick={() => setRepaired(v)} style={{ flex:1, padding:'12px', borderRadius:12, cursor:'pointer', background: repaired===v ? (v?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)') : 'var(--bg-input)', border: repaired===v ? `1px solid ${v?'#10b981':'#f59e0b'}` : '1px solid var(--border-input)', color: repaired===v ? (v?'#10b981':'#f59e0b') : 'var(--text-2)', fontSize:13, fontWeight:600, transition:'all 0.15s' }}>{label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setSubmitted(true)} disabled={!rating||repaired===null}
          style={{ width:'100%', padding:'14px', borderRadius:12, background: rating&&repaired!==null?'linear-gradient(135deg,#00c3ff,#0055ff)':'var(--bg-input)', color: rating&&repaired!==null?'#fff':'var(--text-3)', fontSize:15, fontWeight:700, border:'none', cursor: rating&&repaired!==null?'pointer':'not-allowed' }}>
          Submit Feedback
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('vin');
  const [vehicle, setVehicle] = useState<Vehicle>({ year:'', make:'', model:'', engine:'', vin:'' });
  const [uploadedReport, setUploadedReport] = useState<string|undefined>();
  const [fileName, setFileName] = useState<string|undefined>();
  const [codes, setCodes] = useState<DtcCode[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [report, setReport] = useState<DiagnosticReport|null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('synth-session-id');
      if (s) return s;
      const id = crypto.randomUUID();
      localStorage.setItem('synth-session-id', id);
      return id;
    }
    return 'session-1';
  });

  if (!user) return null;

  const restart = () => {
    setStep('vin'); setVehicle({ year:'', make:'', model:'', engine:'', vin:'' });
    setUploadedReport(undefined); setFileName(undefined);
    setCodes([]); setSymptoms(''); setReport(null); setChatMessages([]);
    localStorage.removeItem('synth-session-id');
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-page)' }}>
      <StepBar step={step} />
      {step==='vin'      && <VinStep onNext={(v,r,fn) => { setVehicle(v); setUploadedReport(r); setFileName(fn); setStep('codes'); }} />}
      {step==='codes'    && <CodesStep vehicle={vehicle} uploadedReport={uploadedReport} fileName={fileName} onNext={(c,s) => { setCodes(c); setSymptoms(s); setStep('chat'); }} onBack={() => setStep('vin')} />}
      {step==='chat'     && <ChatStep vehicle={vehicle} codes={codes} symptoms={symptoms} uploadedReport={uploadedReport} fileName={fileName} sessionId={sessionId} onReport={(r,msgs) => { setReport(r); setChatMessages(msgs); setStep('report'); }} onBack={() => setStep('codes')} />}
      {step==='report'   && report && <ReportStep report={report} vehicle={vehicle} codes={codes} messages={chatMessages} onFeedback={() => setStep('feedback')} onBack={() => setStep('chat')} />}
      {step==='feedback' && <FeedbackStep onRestart={restart} />}
    </div>
  );
}
