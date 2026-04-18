'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { assertAcceptableScannerPdf, getPdfSizeViolationMessage, readPdfAsRawBase64 } from '@/lib/scannerPdf';
import {
  Send, Zap, Plus, X, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown,
  RotateCcw, Upload, Search, Car, Info
} from 'lucide-react';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';

type Step = 'vin' | 'codes' | 'chat' | 'report' | 'feedback';
interface Vehicle { year: string; make: string; model: string; engine: string; vin: string; }
interface DtcCode { code: string; description: string; }
interface Message { id: string; role: 'user' | 'synth'; content: string; ts: number; }
interface DiagnosticReport {
  summary: string; rootCause: string; confidence: number;
  recommendedActions: string[]; partsNeeded: string[];
  estimatedTime: string; additionalNotes: string;
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

function VinStep({ onNext }: { onNext: (vehicle: Vehicle, uploadedReport?: string, fileName?: string, pdfBase64?: string) => void }) {
  const [vin, setVin] = useState('');
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
  const [vehicle, setVehicle] = useState<Vehicle>({ year:'', make:'', model:'', engine:'', vin:'' });
  const [showManual, setShowManual] = useState(false);
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
    if (vin.length < 10) return;
    setLookingUp(true);
    await new Promise(r => setTimeout(r, 600));
    setVehicle(v => ({ ...v, vin }));
    setLookingUp(false);
    setShowManual(true);
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
            {showCamera ? '&#x2715;' : '&#x1F4F7;'}
          </button>
          </div>
          {cameraError && <p style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{cameraError}</p>}
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

function CodesStep({ vehicle, uploadedReport, fileName, onNext, onBack }:
  { vehicle: Vehicle; uploadedReport?: string; fileName?: string; onNext: (codes: DtcCode[], symptoms: string) => void; onBack: () => void }
) {
  const [codes, setCodes] = useState<DtcCode[]>([{ code:'', description:'' }]);
  const [symptoms, setSymptoms] = useState('');
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

function ChatStep({ vehicle, codes, symptoms, uploadedReport, fileName, pdfBase64, sessionId, onReport, onBack }:
  { vehicle: Vehicle; codes: DtcCode[]; symptoms: string; uploadedReport?: string; fileName?: string; pdfBase64?: string; sessionId: string;
    onReport: (report: DiagnosticReport, messages: Message[], updatedVehicle?: Vehicle) => void; onBack: () => void }
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
        ? `${nl}Scanner Data (from ${fileName || 'uploaded file'}):${nl}${uploadedReport.substring(0, 1500)}`
        : null;
  const initMsg = [
    vehicle.year && vehicle.make ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.engine ? ' ' + vehicle.engine : ''}` : vehicle.vin ? `VIN: ${vehicle.vin}` : null,
    codes.length > 0 ? `DTC Codes: ${codes.map(c => c.code + (c.description ? ' (' + c.description + ')' : '')).join(', ')}` : null,
    symptomsForSynth ? `Symptoms: ${symptomsForSynth}` : null,
    scannerContextLine,
  ].filter(Boolean).join(nl);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosisComplete, setDiagnosisComplete] = useState(false);
  const [synthConfidence, setSynthConfidence] = useState<number>(0);
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
  const [autoSent, setAutoSent] = useState(false);
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
      onReport(buildReport(), messages, updatedVehicle);
    } catch(e) {
      // NHTSA API failed -- just accept the VIN and proceed
      stopVinGateCamera(); setShowVinGate(false);
      onReport(buildReport(), messages, {...vehicle, vin});
    }
    setVinValidating(false);
  };



  const sendMessage = async (text: string, displayText?: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now()+'u', role:'user', content: displayText || text, ts:Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const pdfToSend = pdfBase64 || '';
    const pdfNameToSend = pdfToSend ? (fileName || 'scan.pdf') : '';

    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 60000);
      const warmTimer = setTimeout(() => setWarmingUp(true), 5000);
      const res = await fetch(SYNTH_API + '/api/diagnostic/stream', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + API_TOKEN },
        body: JSON.stringify({ session_id:sessionId, message:text, vehicle, ...(pdfToSend ? { pdf_base64: pdfToSend, pdf_name: pdfNameToSend } : {}) }),
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
        try { const p = JSON.parse(payload); sseContent += p.token ?? p.text ?? p.response ?? p.message ?? ''; }
        if (p.ready_for_report === true) {
          setDiagnosisComplete(true);
          if (p.confidence) setSynthConfidence(Number(p.confidence));
        }
        catch { if (payload) sseContent += payload; }
      }
      const reply = sseContent || (()=>{ try { return JSON.parse(rawText).response || JSON.parse(rawText).message || ''; } catch { return rawText.trim(); } })();
      setMessages(prev => [...prev, { id: Date.now()+'s', role: 'synth', content: reply, ts: Date.now() }]);
      setApiStatus('ok');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setWarmingUp(false);
        setMessages((prev: any[]) => [...prev, { role: 'assistant', content: 'Request timed out - please try again in a moment.' }]);
      } else {
      setApiStatus('error');
      setMessages(prev => [...prev, { id: Date.now()+'e', role:'synth', content:'Unable to connect to Synth. Please check your connection and try again.', ts:Date.now() }]);
      }
    } finally { setLoading(false); setWarmingUp(false); }
  };
  useEffect(() => { if (!autoSent && initMsg) { setAutoSent(true); sendMessage(initMsg, [vehicle.year && vehicle.make ? 'Analyzing: ' + vehicle.year + ' ' + vehicle.make + ' ' + vehicle.model : 'Analyzing scanner data', fileName ? '(' + fileName + ')' : '', codes.filter((c:any)=>c.code).length > 0 ? codes.filter((c:any)=>c.code).length + ' fault code(s) detected' : '', symptoms ? 'Symptoms: ' + symptoms.substring(0,80) : ''].filter(Boolean).join(' -- ')); } }, []);
  const buildReport = (): DiagnosticReport => ({
    summary: `Diagnostic for ${vehicle.year||''} ${vehicle.make||''} ${vehicle.model||''}`.trim(),
    rootCause: messages.filter(m => m.role==='synth').slice(-1)[0]?.content.substring(0,300) || 'See conversation',
    confidence: messages.filter((m:any)=>m.role==='synth').length > 0 ? 85 : 0,
    recommendedActions: (() => {
      const synthText = messages.filter((m:any)=>m.role==='synth').slice(-1)[0]?.content || '';
      const numbered = synthText.match(/^\d+\.\s+.+/gm) || [];
      const bulleted = synthText.match(/^[-*]\s+.+/gm) || [];
      const found = [...numbered, ...bulleted].map((s:string)=>s.replace(/^[\d.\-*\s]+/,'')).filter(Boolean).slice(0,6);
      return found.length > 0 ? found : ['Review Synth findings above', 'Verify with physical inspection', 'Clear codes after repair'];
    })(),
    partsNeeded: codes.map(c => c.code),
    estimatedTime: '1-3 hours',
    additionalNotes: symptoms,
  });

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
          <button disabled={!diagnosisComplete} onClick={() => { if (vehicle.vin) { onReport(buildReport(), messages); } else { setVinGateInput(''); setVinGateError(''); setShowVinGate(true); } }}
            style={{ padding:'6px 14px', borderRadius:8, background: diagnosisComplete ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-input)', border:'none', color: messages.length > 1 ? '#fff' : 'var(--text-3)', fontSize:12, fontWeight:700, cursor: messages.length > 1 ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
            <FileText size={13} /> View Report
          </button>
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
            <div style={{ padding:'14px 18px', borderRadius:'16px 16px 16px 4px', background:'var(--bg-card)', border:'1px solid var(--border-card)', display:'flex', gap:6, alignItems:'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', opacity:0.4+i*0.3 }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.filter((m:any)=>m.role==='synth').length > 0 && !diagnosisComplete && (
        <div style={{padding:'0 20px 12px'}}>
          <button onClick={()=>{ setDiagnosisComplete(true); setVinGateInput(''); setVinGateError(''); setShowVinGate(true); }}
            style={{width:'100%',padding:'13px',borderRadius:12,border:'none',background:diagnosisComplete?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#6B7280,#4B5563)',boxShadow:diagnosisComplete?'0 0 20px rgba(16,185,129,0.4)':'none',transition:'all 0.3s',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {diagnosisComplete ? 'Synth Is Ready -- Generate Report' : 'Diagnosis Complete -- Generate Report'}
          </button>
        </div>
      )}

      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border-card)', background:'var(--bg-card)', display:'flex', gap:10, flexShrink:0 }}>
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
  );
}

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
              <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#00c3ff,#0055ff)', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={17} color='#fff' /></div>
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
        <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><Zap size={14} color='var(--accent)' /> SYNTH ANALYSIS</div>
          <div style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{lastSynth}</div>
        </div>
        <div style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border-card)', marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={14} color='#10b981' /> RECOMMENDED ACTIONS</div>
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

function FeedbackStep({ onRestart }: { onRestart: () => void }) {
  const [rating, setRating] = useState<'accurate'|'partial'|'inaccurate'|null>(null);
  const [repaired, setRepaired] = useState<boolean|null>(null);
  const [submitted, setSubmitted] = useState(false);
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
            {[{v:true,label:'Yes  Fixed'},{v:false,label:'Not Yet'}].map(({v,label}) => (
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

export default function ChatPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('vin');
  const [vehicle, setVehicle] = useState<Vehicle>({ year:'', make:'', model:'', engine:'', vin:'' });
  const [uploadedReport, setUploadedReport] = useState<string|undefined>();
  const [fileName, setFileName] = useState<string|undefined>();
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string>('');
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
    setUploadedReport(undefined); setFileName(undefined); setUploadedPdfBase64('');
    setCodes([]); setSymptoms(''); setReport(null); setChatMessages([]);
    localStorage.removeItem('synth-session-id');
  };
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-page)' }}>
      <StepBar step={step} />
      {step==='vin'      && <VinStep onNext={(v,r,fn,b64) => { setVehicle(v); setUploadedReport(r); setFileName(fn); setUploadedPdfBase64(b64||''); setStep('codes'); }} />}
      {step==='codes'    && <CodesStep vehicle={vehicle} uploadedReport={uploadedReport} fileName={fileName} onNext={(c,s) => { setCodes(c); setSymptoms(s); setStep('chat'); }} onBack={() => setStep('vin')} />}
      {step==='chat'     && <ChatStep vehicle={vehicle} codes={codes} symptoms={symptoms} uploadedReport={uploadedReport} pdfBase64={uploadedPdfBase64} fileName={fileName} sessionId={sessionId} onReport={(r,msgs) => { setReport(r); setChatMessages(msgs); setStep('report'); }} onBack={() => setStep('codes')} />}
      {step==='report'   && report && <ReportStep report={report} vehicle={vehicle} codes={codes} messages={chatMessages} onFeedback={() => setStep('feedback')} onBack={() => setStep('chat')} />}
      {step==='feedback' && <FeedbackStep onRestart={restart} />}
    </div>
  );
}





