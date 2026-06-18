'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Bell, Shield, HelpCircle, LogOut, ChevronRight, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const handleSignOut = () => { signOut(); router.push('/auth/login'); };
  const navy = '#1B3A6B';
  const teal = '#2E75B6';

  return (
    <>
      <div style={{ maxWidth: 520 }}>

        {/* Profile card */}
        <div style={{ background:'white', border:'1px solid #E0E0E0', borderRadius:16, padding:'24px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:`linear-gradient(135deg, ${navy}, ${teal})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'white', fontSize:20, fontWeight:700 }}>{user?.name?.slice(0,2).toUpperCase()||'ME'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:16, color:navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name||'TechPulse User'}</p>
            <p style={{ margin:'2px 0 4px', fontSize:13, color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email||''}</p>
            <span style={{ display:'inline-block', background:teal, color:'white', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>Mechanic</span>
          </div>
          <Link href="/app/profile" style={{ fontSize:13, fontWeight:600, color:teal, textDecoration:'none', flexShrink:0 }}>Edit</Link>
        </div>

        {/* Account settings */}
        <div style={{ background:'white', border:'1px solid #E0E0E0', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
          {[
            { label:'Billing & Subscription', icon:CreditCard, href:'/app/billing', desc:'Manage your plan and payments' },
            { label:'Team',                    icon:Users,      href:'/app/settings/team', desc:'Manage members and invites' },
            { label:'Notifications',           icon:Bell,       href:'/app/notifications', desc:'Alert preferences' },
            { label:'Privacy & Security',      icon:Shield,     href:'/app/settings/privacy', desc:'Account security settings' },
            { label:'Help & Support',          icon:HelpCircle, href:'/app/settings/help', desc:'Get help with TechPulse' },
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href} style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
              borderBottom: i < arr.length-1 ? '1px solid #F0F0F0' : 'none',
              textDecoration:'none', background:'white', transition:'background 0.15s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='#F8F9FA')}
            onMouseLeave={e=>(e.currentTarget.style.background='white')}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#F0F4FA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <item.icon size={16} color={teal} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:navy }}>{item.label}</p>
                <p style={{ margin:0, fontSize:12, color:'#999' }}>{item.desc}</p>
              </div>
              <ChevronRight size={16} color="#CCC" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ background:'white', border:'1px solid #E0E0E0', borderRadius:16, overflow:'hidden', marginBottom:24 }}>
          {!showSignOutConfirm ? (
            <button onClick={()=>setShowSignOutConfirm(true)} style={{
              display:'flex', alignItems:'center', gap:14, padding:'14px 20px', width:'100%',
              background:'none', border:'none', cursor:'pointer', transition:'background 0.15s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='#FFF5F5')}
            onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#FFF0F0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <LogOut size={16} color="#E74C3C" />
              </div>
              <span style={{ fontSize:14, fontWeight:600, color:'#E74C3C' }}>Sign Out</span>
            </button>
          ) : (
            <div style={{ padding:'16px 20px' }}>
              <p style={{ margin:'0 0 12px', fontSize:14, fontWeight:600, color:navy }}>Sign out of TechPulse?</p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleSignOut} style={{ flex:1, padding:'10px', background:'#E74C3C', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:13 }}>Sign Out</button>
                <button onClick={()=>setShowSignOutConfirm(false)} style={{ flex:1, padding:'10px', background:'#F5F5F5', color:'#333', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:13 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#BBB' }}>TechPulse v2.0</p>
      </div>
    </>
  );
}


