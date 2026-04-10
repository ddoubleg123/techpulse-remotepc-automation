'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Send, Zap, Plus, X, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown, RotateCcw, Download } from 'lucide-react';

// ─── API CONFIG (matches mobile src/config/api.ts) ───────────────
const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = 'tp_9f4e2a7c1d8b3f6e0a5c9d2f7b4e1a8c';

// ─── TYPES ───────────────────────────────────────────────────────
type Step = 'vehicle' | 'codes' | 'chat' | 'report' | 'feedback';

interface Vehicle { year: string; make: string; model: string; engine: string; vin: string; }
interface DtcCode { code: string; description: string; }
interface Message { id: string; role: 'user' | 'synth'; content: string; ts: number; }
interface DiagnosticReport {
  summary: string;
  rootCause: string;
  confidence: number;
  recommendedActions: string[];
  partsNeeded: string[];
  estimatedTime: string;
  additionalNotes: string;
}

// ─── STEP INDICATOR ──────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'codes',   label: 'Codes' },
    { id: 'chat',    label: 'Diagnose' },
    { id: 'report',  label: 'Report' },
    { id: 'feedback',label: 'Confirm' },
  ];
  const idx = steps.findIndex(s => s.id === step);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '14px 24px', borderBottom: '1px solid var(--border-card)', background: 'var(--bg-card)', flexShrink: 0 }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: i < idx ? '#10b981' : i === idx ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
              color: i <= idx ? '#fff' : 'var(--text-3)',
              border: i === idx ? '2px solid rgba(0,195,255,0.4)' : '2px solid transparent',
              boxShadow: i === idx ? '0 0 12px rgba(0,195,255,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, fontWeight: i === idx ? 700 : 500, color: i === idx ? 'var(--accent)' : i < idx ? '#10b981' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 40, height: 2, background: i < idx ? '#10b981' : 'var(--border-card)', margin: '0 4px 16px', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── STEP 1: VEHICLE INFO ─────────────────────────────────────────
function VehicleStep({ onNext }: { onNext: (v: Vehicle) => void }) {
  const [v, setV] = useState<Vehicle>({ year: '', make: '', model: '', engine: '', vin: '' });
  const fields: { key: keyof Vehicle; label: string; placeholder: string; required: boolean }[] = [
    { key: 'year',   label: 'Year *',   placeholder: '2015',            required: true },
    { key: 'make',   label: 'Make *',   placeholder: 'Ford',            required: true },
    { key: 'model',  label: 'Model *',  placeholder: 'F-150',           required: true },
    { key: 'engine', label: 'Engine *', placeholder: '3.5L EcoBoost',  required: true },
    { key: 'vin',    label: 'VIN',      placeholder: '1HGBH41JXMN109186', required: false },
  ];
  const canProceed = v.year && v.make && v.model && v.engine;
  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>Vehicle Information</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Enter the vehicle details before starting the diagnostic.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.key === 'vin' ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{f.label}</label>
              <input value={v[f.key]} onChange={e => setV(p => ({...p, [f.key]: e.target.value}))} placeholder={f.placeholder} style={inp} />
            </div>
          ))}
        </div>
        <button onClick={() => canProceed && onNext(v)} disabled={!canProceed} style={{
          width: '100%', marginTop: 24, padding: '14px', borderRadius: 12,
          background: canProceed ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
          color: canProceed ? '#fff' : 'var(--text-3)', fontSize: 15, fontWeight: 700,
          border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          Continue to Codes <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: DTC CODES ───────────────────────────────────────────
function CodesStep({ vehicle, onNext, onBack }: { vehicle: Vehicle; onNext: (codes: DtcCode[], symptoms: string) => void; onBack: () => void }) {
  const [codes, setCodes] = useState<DtcCode[]>([{ code: '', description: '' }]);
  const [symptoms, setSymptoms] = useState('');
  const addCode = () => setCodes(p => [...p, { code: '', description: '' }]);
  const removeCode = (i: number) => setCodes(p => p.filter((_, idx) => idx !== i));
  const updateCode = (i: number, field: keyof DtcCode, val: string) => setCodes(p => p.map((c, idx) => idx === i ? {...c, [field]: val} : c));
  const validCodes = codes.filter(c => c.code.trim());
  const canProceed = validCodes.length > 0 || symptoms.trim().length > 10;
  const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 9, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Vehicle summary */}
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg-feed)', border: '1px solid var(--border-card)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{vehicle.year} {vehicle.make} {vehicle.model}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>— {vehicle.engine}</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>DTC Codes</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Add all fault codes from your scanner. Add symptoms if no codes.</p>
        </div>

        {/* DTC code rows */}
        <div style={{ marginBottom: 16 }}>
          {codes.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={c.code} onChange={e => updateCode(i, 'code', e.target.value.toUpperCase())} placeholder="P0171" style={{ ...inp, width: 100, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }} />
              <input value={c.description} onChange={e => updateCode(i, 'description', e.target.value)} placeholder="Description (optional)" style={{ ...inp, flex: 1 }} />
              {codes.length > 1 && (
                <button onClick={() => removeCode(i)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={14} color="#f87171" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'var(--bg-input)', border: '1px dashed var(--border-input)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add another code
          </button>
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Symptoms / Additional Context</label>
          <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={4}
            placeholder="Describe what the vehicle is doing, when it happens, any recent repairs..."
            style={{ ...inp, width: '100%', resize: 'none', lineHeight: 1.5 }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '13px 20px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button onClick={() => canProceed && onNext(validCodes, symptoms)} disabled={!canProceed} style={{
            flex: 1, padding: '13px', borderRadius: 12,
            background: canProceed ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
            color: canProceed ? '#fff' : 'var(--text-3)', fontSize: 15, fontWeight: 700,
            border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            Start Diagnosis <Zap size={16} fill={canProceed ? '#fff' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3: DIAGNOSTIC CHAT ─────────────────────────────────────
function ChatStep({ vehicle, codes, symptoms, sessionId, onReport, onBack }:
  { vehicle: Vehicle; codes: DtcCode[]; symptoms: string; sessionId: string; onReport: (report: DiagnosticReport, messages: Message[]) => void; onBack: () => void }
) {
  const initMsg = `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.engine}${vehicle.vin ? ' VIN: '+vehicle.vin : ''}\n` +
    (codes.length ? `DTC Codes: ${codes.map(c => c.code + (c.description ? ' ('+c.description+')' : '')).join(', ')}\n` : '') +
    (symptoms ? `Symptoms: ${symptoms}` : '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now()+'u', role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(SYNTH_API + '/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_TOKEN },
        body: JSON.stringify({ session_id: sessionId, message: text, vehicle }),
      });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      const reply = data.response || data.message || 'Analyzing...';
      const synthMsg: Message = { id: Date.now()+'s', role: 'synth', content: reply, ts: Date.now() };
      setMessages(prev => [...prev, synthMsg]);
    } catch (e: unknown) {
      const errMsg: Message = { id: Date.now()+'e', role: 'synth', content: 'Connection error. Please check your network and try again.', ts: Date.now() };
      setMessages(prev => [...prev, errMsg]);
    } finally { setLoading(false); }
  };

  // Auto-send the initial diagnostic on mount
  useEffect(() => {
    if (!autoSent) { setAutoSent(true); sendMessage(initMsg); }
  }, []);

  const buildReport = (): DiagnosticReport => ({
    summary: `Diagnostic analysis for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    rootCause: messages.filter(m => m.role === 'synth').slice(-1)[0]?.content.substring(0, 300) || 'See conversation',
    confidence: 82,
    recommendedActions: ['Review Synth findings above', 'Verify with physical inspection', 'Clear codes after repair'],
    partsNeeded: codes.map(c => c.code),
    estimatedTime: '1-3 hours',
    additionalNotes: symptoms,
  });

  const iconStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Vehicle header bar */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-card)', background: 'var(--bg-feed)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{vehicle.year} {vehicle.make} {vehicle.model}</span>
          {codes.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{codes.map(c=>c.code).join(' · ')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onBack} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>← Back</button>
          <button onClick={() => messages.length > 1 && onReport(buildReport(), messages)}
            disabled={messages.length < 2}
            style={{ padding: '6px 14px', borderRadius: 8, background: messages.length > 1 ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-input)', border: 'none', color: messages.length > 1 ? '#fff' : 'var(--text-3)', fontSize: 12, fontWeight: 700, cursor: messages.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={13} /> View Report
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <div style={{ maxWidth: '72%', padding: '11px 16px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#00c3ff,#0055ff)', color: '#fff', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          ) : (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14, gap: 10 }}>
              <div style={iconStyle}><Zap size={14} color="#fff" fill="#fff" /></div>
              <div style={{ maxWidth: '80%', padding: '11px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-1)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          )
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={iconStyle}><Zap size={14} color="#fff" fill="#fff" /></div>
            <div style={{ padding: '11px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, animation: `pulse ${0.8+i*0.15}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-card)', background: 'var(--bg-card)', display: 'flex', gap: 10, flexShrink: 0 }}>
        <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }}}
          placeholder="Ask a follow-up question or provide more details..."
          style={{ flex: 1, padding: '11px 14px', borderRadius: 11, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 13, outline: 'none', resize: 'none' }} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
          <Send size={17} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 4: DIAGNOSTIC REPORT ───────────────────────────────────
function ReportStep({ report, vehicle, codes, messages, onFeedback, onBack }:
  { report: DiagnosticReport; vehicle: Vehicle; codes: DtcCode[]; messages: Message[]; onFeedback: () => void; onBack: () => void }
) {
  const synthMessages = messages.filter(m => m.role === 'synth');
  const lastSynthMsg = synthMessages[synthMessages.length - 1]?.content || '';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 700 }}>
        {/* Report header */}
        <div style={{ padding: '20px 24px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-card)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>TechPulse Diagnostic Report</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
              </div>
            </div>
            <div style={{ padding: '5px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
              {report.confidence}% Confidence
            </div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-feed)', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{vehicle.year} {vehicle.make} {vehicle.model} — {vehicle.engine}</div>
            {vehicle.vin && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>VIN: {vehicle.vin}</div>}
          </div>
        </div>

        {/* DTC codes */}
        {codes.length > 0 && (
          <div style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="#f59e0b" /> FAULT CODES
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {codes.map((c, i) => (
                <div key={i} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 13 }}>{c.code}</span>
                  {c.description && <span style={{ color: 'var(--text-2)', fontSize: 12, marginLeft: 6 }}>{c.description}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Synth analysis */}
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={14} color="var(--accent)" /> SYNTH ANALYSIS
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lastSynthMsg}</div>
        </div>

        {/* Recommended actions */}
        <div style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} color="#10b981" /> RECOMMENDED ACTIONS
          </div>
          {report.recommendedActions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981' }}>{i+1}</span>
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.5 }}>{a}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '12px 18px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronLeft size={16} /> Back to Chat
          </button>
          <button onClick={onFeedback} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Confirm & Rate <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 5: FEEDBACK ─────────────────────────────────────────────
function FeedbackStep({ vehicle, onRestart }: { vehicle: Vehicle; onRestart: () => void }) {
  const [rating, setRating] = useState<'accurate' | 'partial' | 'inaccurate' | null>(null);
  const [repaired, setRepaired] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    // In production: POST feedback to Supabase via Synth API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle size={36} color="#10b981" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 10px', textAlign: 'center' }}>Diagnosis Complete</h2>
        <p style={{ fontSize: 15, color: 'var(--text-2)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6, marginBottom: 28 }}>
          Thank you for using TechPulse. Your feedback helps Synth improve for every technician.
        </p>
        <button onClick={onRestart} style={{ padding: '13px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RotateCcw size={17} /> New Diagnosis
        </button>
      </div>
    );
  }

  const ratingOpts = [
    { id: 'accurate' as const,   label: 'Accurate',          icon: ThumbsUp,   color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
    { id: 'partial' as const,    label: 'Partially Correct', icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    { id: 'inaccurate' as const, label: 'Inaccurate',        icon: ThumbsDown, color: '#ef4444', bg: 'rgba(239,68,68,0.12)'    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>Confirm Diagnosis</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Help Synth learn by confirming the accuracy of this diagnosis.</p>
        </div>

        {/* Accuracy rating */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 12 }}>How accurate was Synth's diagnosis?</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {ratingOpts.map(({ id, label, icon: Icon, color, bg }) => (
              <button key={id} onClick={() => setRating(id)} style={{
                flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
                background: rating === id ? bg : 'var(--bg-input)',
                border: `1px solid ${rating === id ? color : 'var(--border-input)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}>
                <Icon size={20} color={rating === id ? color : 'var(--text-3)'} />
                <span style={{ fontSize: 12, fontWeight: 600, color: rating === id ? color : 'var(--text-2)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Repaired? */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 12 }}>Was the vehicle repaired based on this diagnosis?</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: true, label: 'Yes — Repaired' }, { v: false, label: 'Not Yet' }].map(({ v, label }) => (
              <button key={String(v)} onClick={() => setRepaired(v)} style={{
                flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                background: repaired === v ? (v ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)') : 'var(--bg-input)',
                border: repaired === v ? `1px solid ${v ? '#10b981' : '#f59e0b'}` : '1px solid var(--border-input)',
                color: repaired === v ? (v ? '#10b981' : '#f59e0b') : 'var(--text-2)',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Additional notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="What was the actual root cause? What was repaired?"
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        <button onClick={submit} disabled={!rating || repaired === null}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: rating && repaired !== null ? 'linear-gradient(135deg,#00c3ff,#0055ff)' : 'var(--bg-input)',
            color: rating && repaired !== null ? '#fff' : 'var(--text-3)',
            fontSize: 15, fontWeight: 700, border: 'none',
            cursor: rating && repaired !== null ? 'pointer' : 'not-allowed',
          }}>
          Submit Feedback
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('vehicle');
  const [vehicle, setVehicle] = useState<Vehicle>({ year: '', make: '', model: '', engine: '', vin: '' });
  const [codes, setCodes] = useState<DtcCode[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [report, setReport] = useState<DiagnosticReport | null>(null);
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <StepBar step={step} />
      {step === 'vehicle'  && <VehicleStep onNext={v => { setVehicle(v); setStep('codes'); }} />}
      {step === 'codes'    && <CodesStep vehicle={vehicle} onNext={(c, s) => { setCodes(c); setSymptoms(s); setStep('chat'); }} onBack={() => setStep('vehicle')} />}
      {step === 'chat'     && <ChatStep vehicle={vehicle} codes={codes} symptoms={symptoms} sessionId={sessionId} onReport={(r, msgs) => { setReport(r); setChatMessages(msgs); setStep('report'); }} onBack={() => setStep('codes')} />}
      {step === 'report'   && report && <ReportStep report={report} vehicle={vehicle} codes={codes} messages={chatMessages} onFeedback={() => setStep('feedback')} onBack={() => setStep('chat')} />}
      {step === 'feedback' && <FeedbackStep vehicle={vehicle} onRestart={() => { setStep('vehicle'); setVehicle({ year:'', make:'', model:'', engine:'', vin:'' }); setCodes([]); setSymptoms(''); setReport(null); setChatMessages([]); localStorage.removeItem('synth-session-id'); }} />}
    </div>
  );
}
