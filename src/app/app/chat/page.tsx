'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Send, Zap, Car, AlertCircle } from 'lucide-react';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = 'tp_9f4e2a7c1d8b3f6e0a5c9d2f7b4e1a8c';

interface Message {
  role: 'user' | 'synth';
  content: string;
  ts: number;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'synth', content: 'Ready to diagnose. Tell me the vehicle year, make, model, and describe the symptom or paste your DTC codes.', ts: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [vehicle, setVehicle] = useState({ year: '', make: '', model: '', engine: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synth-session-id');
      if (stored) return stored;
      const id = crypto.randomUUID();
      localStorage.setItem('synth-session-id', id);
      return id;
    }
    return 'session-1';
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setError('');

    setMessages(prev => [...prev, { role: 'user', content: userMsg, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch(SYNTH_API + '/api/diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_TOKEN,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMsg,
          vehicle: vehicle.year ? vehicle : undefined,
        }),
      });

      if (!res.ok) throw new Error('Synth API error: ' + res.status);
      const data = await res.json();
      const reply = data.response || data.message || 'Synth is processing...';
      setMessages(prev => [...prev, { role: 'synth', content: reply, ts: Date.now() }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setError(msg);
      setMessages(prev => [...prev, { role: 'synth', content: 'Error connecting to Synth: ' + msg, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page:      { flex: 1, display: 'flex', flexDirection: 'column' as const, height: '100%', background: 'var(--bg-page)', overflow: 'hidden' },
    topBar:    { padding: '14px 20px', borderBottom: '1px solid var(--border-card)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
    synthDot:  { width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.8)' },
    vehicle:   { padding: '12px 20px', borderBottom: '1px solid var(--border-card)', background: 'var(--bg-feed)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 },
    vinInp:    { padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 13, outline: 'none' },
    msgs:      { flex: 1, overflowY: 'auto' as const, padding: '20px' },
    userBub:   { display: 'flex', justifyContent: 'flex-end', marginBottom: 14 },
    synthBub:  { display: 'flex', justifyContent: 'flex-start', marginBottom: 14 },
    userTxt:   { maxWidth: '72%', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#00c3ff,#0055ff)', color: '#fff', fontSize: 14, lineHeight: 1.5 },
    synthTxt:  { maxWidth: '80%', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const },
    synthIcon: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' },
    inputBar:  { padding: '16px 20px', borderTop: '1px solid var(--border-card)', background: 'var(--bg-card)', display: 'flex', gap: 10, flexShrink: 0 },
    textInput: { flex: 1, padding: '12px 16px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)', fontSize: 14, outline: 'none', resize: 'none' as const },
    sendBtn:   { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#00c3ff,#0055ff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  };

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.synthIcon}><Zap size={16} color="#fff" fill="#fff" /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Synth AI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={S.synthDot} />
            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Online</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· 6,000+ diagnostic cases</span>
          </div>
        </div>
      </div>

      {/* Vehicle inputs */}
      <div style={S.vehicle}>
        {(['year','make','model','engine'] as const).map(field => (
          <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={vehicle[field]}
            onChange={e => setVehicle(prev => ({...prev, [field]: e.target.value}))}
            style={S.vinInp}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} color="#f87171" />
          <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
        </div>
      )}

      {/* Messages */}
      <div style={S.msgs}>
        {messages.map((msg, i) => (
          msg.role === 'user' ? (
            <div key={i} style={S.userBub}>
              <div style={S.userTxt}>{msg.content}</div>
            </div>
          ) : (
            <div key={i} style={S.synthBub}>
              <div style={S.synthIcon}><Zap size={14} color="#fff" fill="#fff" /></div>
              <div style={S.synthTxt}>{msg.content}</div>
            </div>
          )
        ))}
        {loading && (
          <div style={S.synthBub}>
            <div style={S.synthIcon}><Zap size={14} color="#fff" fill="#fff" /></div>
            <div style={{ ...S.synthTxt, color: 'var(--text-3)' }}>Synth is analyzing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputBar}>
        <textarea
          rows={1}
          placeholder="Describe symptoms, paste DTC codes, or upload scan data..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          style={S.textInput}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          style={{ ...S.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}>
          <Send size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}
