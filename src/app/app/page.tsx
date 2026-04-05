'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, RefreshCw, FileText, ArrowRight, CheckCircle, AlertTriangle, Clock, Activity } from 'lucide-react';

const S = {
  page:       { background: '#0b1120', flex: 1, overflowY: 'auto' as const, padding: '32px' },
  hero:       { background: 'linear-gradient(135deg, #112244 0%, #0d1e3a 60%, #0a1628 100%)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 20, padding: '32px', marginBottom: 24, position: 'relative' as const, overflow: 'hidden' as const },
  heroBadge:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  heroDot:    { width: 8, height: 8, borderRadius: '50%', background: '#34d399' },
  heroBadgeTx:{ fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  heroTitle:  { fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.2 },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  heroBtn:    { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #00c8ff 0%, #0055ff 100%)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' as const },
  heroGlow:   { position: 'absolute' as const, top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,180,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' as const },
  grid3:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 },
  statCard:   { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 24px' },
  statLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10, fontWeight: 500 },
  actionCard: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: 14, textDecoration: 'none' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionTitle:{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 },
  actionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  actionLink: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'rgba(0,200,255,0.8)', marginTop: 'auto' },
  sectionHd:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTx:  { fontSize: 15, fontWeight: 700, color: '#fff' },
  viewAll:    { fontSize: 12, fontWeight: 600, color: 'rgba(0,200,255,0.8)', textDecoration: 'none' },
  feedCard:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' },
  feedRow:    { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px' },
  feedIcon:   { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feedTitle:  { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 },
  feedDesc:   { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  feedTime:   { display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto', paddingLeft: 16 },
  feedTimeTx: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
};

const quickActions = [
  { href: '/app/chat',    icon: MessageSquare, title: 'Chat with Synth', desc: 'AI vehicle diagnosis',      bg: 'linear-gradient(135deg,#00c8ff,#0055ff)', shadow: 'rgba(0,200,255,0.25)' },
  { href: '/app/sync',    icon: RefreshCw,     title: 'Sync Data',       desc: 'Connect diagnostic tools', bg: 'linear-gradient(135deg,#a855f7,#6366f1)', shadow: 'rgba(168,85,247,0.25)' },
  { href: '/app/reports', icon: FileText,       title: 'View Reports',    desc: 'Diagnostic history',       bg: 'linear-gradient(135deg,#10b981,#059669)', shadow: 'rgba(16,185,129,0.25)' },
];

const feed = [
  { icon: CheckCircle,   color: '#10b981', title: 'Sync Complete',  desc: 'Synced with 2 devices',                         time: '5 min ago' },
  { icon: FileText,      color: '#00c8ff', title: 'New Report',     desc: 'VIN: 1HGBH41JXMN109186 complete',               time: '1 hr ago'  },
  { icon: AlertTriangle, color: '#f59e0b', title: 'DTC Detected',   desc: 'P0420 — 2018 Honda Accord',                     time: '3 hr ago'  },
  { icon: Activity,      color: '#a855f7', title: 'AI Analysis',    desc: 'Synth completed root-cause analysis',            time: '5 hr ago'  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!user) router.push('/auth/login'); }, [user, router]);
  if (!user) return null;

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={S.heroBadge}><div style={S.heroDot} /><span style={S.heroBadgeTx}>Synth AI Online</span></div>
            <div style={S.heroTitle}>Ready to diagnose</div>
            <div style={S.heroSub}>AI engine active · 6,000+ diagnostic cases · 80–85% accuracy</div>
          </div>
          <Link href="/app/chat" style={S.heroBtn}>Start Diagnosis <ArrowRight size={16} /></Link>
        </div>
      </div>

      {/* Stats */}
      <div style={S.grid3}>
        {[
          { label: 'Active Devices',    value: '1', color: '#00c8ff' },
          { label: 'Reports Generated', value: '1', color: '#a855f7' },
          { label: 'Notifications',     value: '2', color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={S.statCard}>
            <div style={S.statLabel}>{label}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={S.sectionHd}><span style={S.sectionTx}>Quick Actions</span></div>
        <div style={S.grid3}>
          {quickActions.map(({ href, icon: Icon, title, desc, bg, shadow }) => (
            <Link key={href} href={href} style={S.actionCard}>
              <div style={{ ...S.actionIcon, background: bg, boxShadow: `0 8px 20px ${shadow}` }}>
                <Icon size={20} color="#fff" />
              </div>
              <div><div style={S.actionTitle}>{title}</div><div style={S.actionDesc}>{desc}</div></div>
              <div style={S.actionLink}>Open <ArrowRight size={12} /></div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div>
        <div style={S.sectionHd}>
          <span style={S.sectionTx}>Recent Activity</span>
          <Link href="/app/reports" style={S.viewAll}>View all</Link>
        </div>
        <div style={S.feedCard}>
          {feed.map(({ icon: Icon, color, title, desc, time }, i) => (
            <div key={i} style={{ ...S.feedRow, borderBottom: i < feed.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ ...S.feedIcon, background: color + '20' }}><Icon size={16} color={color} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.feedTitle}>{title}</div>
                <div style={{ ...S.feedDesc, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>
              </div>
              <div style={S.feedTime}><Clock size={11} color="rgba(255,255,255,0.25)" /><span style={S.feedTimeTx}>{time}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
