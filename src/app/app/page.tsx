'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, RefreshCw, FileText, ArrowRight, CheckCircle, AlertTriangle, Clock, Activity, Zap, TrendingUp } from 'lucide-react';

const actions = [
  { href:'/app/chat',    Icon:MessageSquare, label:'Chat with Synth',  sub:'AI vehicle diagnosis',      g:'135deg,#00c3ff,#0055ff', glow:'rgba(0,195,255,0.3)'  },
  { href:'/app/sync',    Icon:RefreshCw,     label:'Sync Data',        sub:'Connect diagnostic tools',  g:'135deg,#a855f7,#6d28d9', glow:'rgba(168,85,247,0.3)' },
  { href:'/app/reports', Icon:FileText,      label:'View Reports',     sub:'Browse diagnostic history', g:'135deg,#10b981,#047857', glow:'rgba(16,185,129,0.3)' },
];

const feed = [
  { Icon:CheckCircle,   c:'#10b981', bg:'rgba(16,185,129,0.12)',  t:'Sync Complete',  d:'Synced with 2 devices',              time:'5 min ago' },
  { Icon:FileText,      c:'#00c3ff', bg:'rgba(0,195,255,0.12)',   t:'New Report',     d:'VIN: 1HGBH41JXMN109186 complete',    time:'1 hr ago'  },
  { Icon:AlertTriangle, c:'#f59e0b', bg:'rgba(245,158,11,0.12)',  t:'DTC Detected',   d:'P0420 — 2018 Honda Accord',          time:'3 hr ago'  },
  { Icon:Activity,      c:'#a855f7', bg:'rgba(168,85,247,0.12)',  t:'AI Analysis',    d:'Synth completed root-cause analysis', time:'5 hr ago'  },
];

const stats = [
  { label:'Active Devices',    val:'1',   color:'#00c3ff', sub:'+0 this week', Icon:Zap        },
  { label:'Reports Generated', val:'1',   color:'#a855f7', sub:'View history',  Icon:FileText   },
  { label:'Notifications',     val:'2',   color:'#f59e0b', sub:'2 unread',      Icon:Activity   },
  { label:'Accuracy Rate',     val:'82%', color:'#10b981', sub:'AI diagnostics', Icon:TrendingUp },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(()=>{ if(!user) router.push('/auth/login'); },[user,router]);
  if(!user) return null;

  return (
    <div style={{ flex:1, overflowY:'auto', background:'var(--bg-page)', padding:'28px 28px 40px' }}>

      {/* ── HERO ─────────────────────────────────────── */}
      <div style={{
        position:'relative', overflow:'hidden', borderRadius:20,
        background:'var(--bg-hero)', border:'1px solid var(--border-hero)',
        padding:'32px 36px', marginBottom:24,
        boxShadow:'0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* decorative orbs */}
        <div style={{ position:'absolute', top:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,195,255,0.12) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 65%)', pointerEvents:'none' }} />
        {/* grid texture */}
        <div style={{ position:'absolute', inset:0, opacity:0.03, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />

        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:24 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', display:'inline-block', boxShadow:'0 0 8px rgba(52,211,153,0.8)' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#34d399', letterSpacing:'0.08em', textTransform:'uppercase' }}>Synth AI Online</span>
              <span style={{ padding:'2px 8px', borderRadius:20, background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.25)', fontSize:10, color:'rgba(52,211,153,0.9)', fontWeight:600 }}>Active</span>
            </div>
            <h2 style={{ fontSize:28, fontWeight:800, color:'#fff', margin:'0 0 8px', lineHeight:1.1, letterSpacing:'-0.02em' }}>
              Ready to diagnose
            </h2>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.5 }}>
              AI engine active · 6,000+ diagnostic cases · 80–85% accuracy
            </p>
          </div>
          <Link href="/app/chat" style={{
            display:'flex', alignItems:'center', gap:8, flexShrink:0,
            padding:'13px 24px', borderRadius:14, textDecoration:'none',
            background:'linear-gradient(135deg,#00c3ff 0%,#0055ff 100%)',
            color:'#fff', fontSize:14, fontWeight:700,
            boxShadow:'0 6px 20px rgba(0,195,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            whiteSpace:'nowrap',
          }}>
            <Zap size={16} fill="#fff" /> Start Diagnosis
          </Link>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {stats.map(({ label, val, color, sub, Icon }) => (
          <div key={label} className="card-hover" style={{
            padding:'20px 20px 18px', borderRadius:16,
            background:'var(--bg-card)', border:'1px solid var(--border-card)',
            boxShadow:'var(--shadow-card)',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:12, fontWeight:500, color:'var(--text-2)' }}>{label}</span>
              <div style={{ width:28, height:28, borderRadius:7, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={14} color={color} />
              </div>
            </div>
            <div style={{ fontSize:30, fontWeight:800, color, lineHeight:1, marginBottom:6 }}>{val}</div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── QUICK ACTIONS ────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:0 }}>Quick Actions</h3>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {actions.map(({ href, Icon, label, sub, g, glow }) => (
            <Link key={href} href={href} className="card-hover" style={{
              display:'flex', flexDirection:'column', gap:14,
              padding:'22px 20px', borderRadius:16, textDecoration:'none',
              background:'var(--bg-card)', border:'1px solid var(--border-card)',
              boxShadow:'var(--shadow-card)',
            }}>
              <div style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background:`linear-gradient(${g})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 6px 18px ${glow}`,
              }}>
                <Icon size={20} color="#fff" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:12, color:'var(--text-2)' }}>{sub}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--accent)' }}>Open</span>
                <ArrowRight size={12} color="var(--accent)" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── ACTIVITY ─────────────────────────────────── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', margin:0 }}>Recent Activity</h3>
          <Link href="/app/reports" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>View all →</Link>
        </div>
        <div style={{ borderRadius:16, overflow:'hidden', background:'var(--bg-feed)', border:'1px solid var(--border-feed)', boxShadow:'var(--shadow-card)' }}>
          {feed.map(({ Icon, c, bg, t, d, time }, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
              borderBottom: i < feed.length-1 ? '1px solid var(--border-row)' : 'none',
            }}>
              {/* timeline dot */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={15} color={c} />
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', marginBottom:2 }}>{t}</div>
                <div style={{ fontSize:12, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                <Clock size={11} color="var(--text-3)" />
                <span style={{ fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap' }}>{time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
