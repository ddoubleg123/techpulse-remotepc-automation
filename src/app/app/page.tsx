// v2
'use client';




import { useAuthStore } from '@/stores/authStore';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, Clock, AlertTriangle, CheckCircle, Plus, FileText } from 'lucide-react';




// Real ticket history — empty for now, will populate from Supabase once connected
const useTickets = () => {
  const [tickets, setTickets] = useState<{
    id: string; vehicle: string; codes: string[]; status: 'open' | 'resolved'; date: string; summary: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);




  useEffect(() => {
    // TODO: replace with real Supabase fetch once diagnostic sessions are persisted
    // const { data } = await supabase.from('diagnostic_sessions').select('*').order('created_at', { ascending: false });
    // setTickets(data || []);
    setLoading(false);
  }, []);




  return { tickets, loading };
};




export default function DashboardPage() {
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('https://techpulse-sync-api.onrender.com/api/profile/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (cancelled || !profile) return;
        useAuthStore.setState((state: any) => ({
          user: state.user ? { ...state.user, ...profile } : state.user,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);
  const router = useRouter();
  const { tickets, loading } = useTickets();




  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);
  if (!user) return null;




  const hour = new Date().getHours();
  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';




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




      {/* ── TICKET HISTORY ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Diagnostic History</h3>
          {tickets.length > 0 && (
            <Link href="/app/reports" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          )}
        </div>




        {loading ? (
          /* Loading skeleton */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)', opacity: 0.5 }} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          /* Empty state */
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
          /* Ticket list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map(ticket => (
              <Link key={ticket.id} href={`/app/reports/${ticket.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: ticket.status === 'resolved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {ticket.status === 'resolved'
                    ? <CheckCircle size={18} color="#10b981" />
                    : <AlertTriangle size={18} color="#f59e0b" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{ticket.vehicle}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ticket.codes.map(c => (
                      <span key={c} style={{ padding: '1px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{c}</span>
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.summary}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: ticket.status === 'resolved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: ticket.status === 'resolved' ? '#10b981' : '#f59e0b' }}>
                    {ticket.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color="var(--text-3)" />
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{ticket.date}</span>
                  </div>
                </div>
                <ArrowRight size={15} color="var(--text-3)" />
              </Link>
            ))}
          </div>
        )}
      </div>
    {user && !user.onboarding_completed && <OnboardingModal />}
    </div>
  );
}
