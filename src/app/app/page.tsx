// v3 — wired to Supabase
'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, Clock, AlertTriangle, CheckCircle, Plus, FileText, TrendingUp, Activity, Wrench } from 'lucide-react';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Each diagnostic session saves ~2.5 hrs vs manual workflow (TechPulse pitch deck)
const HOURS_SAVED_PER_SESSION = 2.5;

type Session = {
  unid: string;
  year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  dtc_codes: string[] | null;
  symptoms: string | null;
  diagnosis_outcome: string | null;
  shop_name: string | null;
  created_at: string;
};

function useSessions(shopId: string | null, shopName: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_ANON_KEY) { setLoading(false); return; }
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('select', 'unid,year,make,model,engine,dtc_codes,symptoms,diagnosis_outcome,shop_id,shop_name,created_at');
    params.set('source', 'eq.web');
    params.set('order', 'created_at.desc');
    params.set('limit', '50');
    // Prefer shop_id (FK); fall back to legacy shop_name string during migration.
    if (shopId) params.set('shop_id', `eq.${shopId}`);
    else if (shopName) params.set('shop_name', `eq.${shopName}`);
    fetch(`${SUPABASE_URL}/rest/v1/diagnostic_case_studies?${params.toString()}`, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.ok ? r.json() : [])
      .then(rows => { if (!cancelled) setSessions(Array.isArray(rows) ? rows : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shopId, shopName]);

  return { sessions, loading };
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function vehicleLabel(s: Session): string {
  return [s.year, s.make, s.model, s.engine].filter(Boolean).join(' ') || 'Unknown vehicle';
}

function isResolved(s: Session): boolean {
  // Web writes default to 'pending_review' — anything else (confirmed_correct, confirmed_incorrect, etc) is closed
  const o = s.diagnosis_outcome;
  return !!o && o !== 'pending_review' && o !== 'pending' && o !== 'in_progress';
}

export default function DashboardPage() {
  const { user, token } = useAuthStore();

  // Profile is read from Supabase (the users table) using the Supabase session JWT,
  // consistent with the rest of the app. The old sync-api call rejected Supabase-issued
  // tokens with a 401 and signed the user out — that caused the dashboard flash + logout.
  const [profileLoaded, setProfileLoaded] = useState(false);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let sub = '';
    try { sub = JSON.parse(atob(token.split('.')[1] || '')).sub || ''; } catch { /* not a JWT */ }
    if (!sub || !SUPABASE_ANON_KEY) { setProfileLoaded(true); return; }
    fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(sub)}&select=onboarding_completed,shop_id,businessName:business_name,name`,
      { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || !rows[0]) return;
        useAuthStore.setState((state: any) => ({
          user: state.user ? { ...state.user, ...rows[0] } : state.user,
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProfileLoaded(true); });
    return () => { cancelled = true; };
  }, [token]);

  const router = useRouter();
  const shopName = (user as any)?.businessName || null;
  const shopId = (user as any)?.shop_id || null;
  const { sessions, loading } = useSessions(shopId, shopName);

  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = sessions.filter(s => new Date(s.created_at).getTime() > oneWeekAgo).length;
    const hoursSaved = Math.round(total * HOURS_SAVED_PER_SESSION);
    const uniqueVehicles = new Set(
      sessions.map(s => [s.year, s.make, s.model].filter(Boolean).join(' ')).filter(Boolean)
    ).size;
    return { total, thisWeek, hoursSaved, uniqueVehicles };
  }, [sessions]);

  if (!user) return null;

  const hour = new Date().getHours();
  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const recent = sessions.slice(0, 8);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-page)', padding: '28px 28px 40px' }}>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20, marginBottom: 24,
        background: 'var(--bg-hero)', border: '1px solid var(--border-hero)',
        padding: '32px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,195,255,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Synth AI Online</span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, {firstName}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Ready to diagnose · 6,000+ diagnostic cases · 80–85% accuracy
            </p>
          </div>
          <Link href="/app/chat" style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            padding: '13px 24px', borderRadius: 14, textDecoration: 'none',
            background: 'linear-gradient(135deg,#00c3ff 0%,#0055ff 100%)', color: '#fff',
            fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
            boxShadow: '0 6px 20px rgba(0,195,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <Plus size={16} /> New Diagnostic
          </Link>
        </div>
      </div>

      {/* ── SHOP STATS ── */}
      {!loading && stats.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard icon={<Activity size={16} />} label="Total sessions" value={String(stats.total)} accent="#00c3ff" />
          <StatCard icon={<TrendingUp size={16} />} label="This week" value={String(stats.thisWeek)} accent="#34d399" />
          <StatCard icon={<Clock size={16} />} label="Hours saved" value={`${stats.hoursSaved}h`} accent="#f59e0b" hint="~2.5h per diagnostic" />
          <StatCard icon={<Wrench size={16} />} label="Vehicles" value={String(stats.uniqueVehicles)} accent="#8b5cf6" />
        </div>
      )}

      {/* ── DIAGNOSTIC HISTORY ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Recent Diagnostics</h3>
          {sessions.length > 0 && (
            <Link href="/app/reports" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)', opacity: 0.5 }} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div style={{
            padding: '52px 24px', borderRadius: 18, textAlign: 'center',
            background: 'var(--bg-card)', border: '2px dashed var(--border-card)',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={24} color="var(--text-3)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>No diagnostics yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
              Start your first diagnostic session. Enter a VIN or upload a scanner report to begin.
            </div>
            <Link href="/app/chat" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, textDecoration: 'none',
              background: 'linear-gradient(135deg,#00c3ff,#0055ff)', color: '#fff',
              fontSize: 14, fontWeight: 700,
            }}>
              <Zap size={15} fill="#fff" /> Start First Diagnostic
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map(s => {
              const resolved = isResolved(s);
              return (
                <Link key={s.unid} href={`/app/diagnostic/${s.unid}`} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                  borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: resolved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {resolved
                      ? <CheckCircle size={18} color="#10b981" />
                      : <AlertTriangle size={18} color="#f59e0b" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{vehicleLabel(s)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(s.dtc_codes || []).slice(0, 3).map(c => (
                        <span key={c} style={{ padding: '1px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{c}</span>
                      ))}
                      {s.symptoms && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                          {s.symptoms.length > 60 ? s.symptoms.slice(0, 60) + '…' : s.symptoms}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: resolved ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: resolved ? '#10b981' : '#f59e0b' }}>
                      {resolved ? 'Resolved' : 'Open'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="var(--text-3)" />
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatRelative(s.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight size={15} color="var(--text-3)" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    {/* Onboarding is now enforced app-wide by OnboardingGate in app-layout.tsx */}
    </div>
  );
}

function StatCard({ icon, label, value, accent, hint }: { icon: React.ReactNode; label: string; value: string; accent: string; hint?: string }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color: accent, display: 'flex' }}>{icon}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
