'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, UserPlus, Mail, Shield, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const SUPABASE_URL = 'https://fcqejcrxtrqdxybgyueu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const navy = '#1B3A6B';
const teal = '#2E75B6';

interface Member {
  user_id: string;
  email: string;
  role: string;
  is_owner: boolean;
  active: boolean;
}
interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

// Roles an owner may deactivate from this UI (never owners/admins/devs).
const DEACTIVATABLE = new Set(['technician', 'member', 'mechanic']);

function authHeaders() {
  const token = useAuthStore.getState().token || SUPABASE_ANON_KEY;
  return { Authorization: 'Bearer ' + token, apikey: SUPABASE_ANON_KEY };
}

function genToken() {
  // URL-safe random token for the invite link
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function TeamPage() {
  const token = useAuthStore((s) => s.token);

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('technician');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [busyMember, setBusyMember] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (!SUPABASE_ANON_KEY) {
        setLoadError('Configuration missing — contact support.');
        setLoading(false);
        return;
      }
      const authToken = useAuthStore.getState().token;
      if (!authToken) return; // wait for persist hydration; effect re-runs on token

      // Who am I / am I an owner? Resolve from v_shop_membership for my own row.
      let sub = '';
      try {
        sub = JSON.parse(atob(authToken.split('.')[1] || '')).sub || '';
      } catch {
        sub = '';
      }

      const memRes = await fetch(
        SUPABASE_URL + '/rest/v1/v_shop_membership?select=user_id,email,role,is_owner,active&order=is_owner.desc,email.asc',
        { headers: authHeaders() }
      );
      if (!memRes.ok) {
        setLoadError('Could not load your team. Please try again.');
        setLoading(false);
        return;
      }
      const mem: Member[] = await memRes.json();
      setMembers(mem);

      const me = mem.find((m) => m.user_id === sub);
      const owner = !!me?.is_owner;
      setIsOwner(owner);
      setShopId(null);

      if (owner) {
        // Resolve my shop_id for invite inserts
        const sidRes = await fetch(
          SUPABASE_URL + '/rest/v1/user_profiles?id=eq.' + encodeURIComponent(sub) + '&select=shop_id',
          { headers: authHeaders() }
        );
        if (sidRes.ok) {
          const rows = await sidRes.json();
          setShopId((rows && rows[0] && rows[0].shop_id) || null);
        }
        // Pending + past invites (owner-readable via RLS)
        const invRes = await fetch(
          SUPABASE_URL +
            '/rest/v1/shop_invites?select=id,email,role,status,created_at,expires_at,accepted_at&order=created_at.desc',
          { headers: authHeaders() }
        );
        if (invRes.ok) setInvites(await invRes.json());
      }
    } catch {
      setLoadError('Could not load your team. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, token]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    setInviteMsg('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setInviteMsg('Enter a valid email address.');
      return;
    }
    if (!shopId) {
      setInviteMsg('Could not resolve your shop. Reload and try again.');
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      setInviteMsg('That person is already on your team.');
      return;
    }
    if (invites.some((i) => i.email.toLowerCase() === email && i.status === 'pending')) {
      setInviteMsg('An invite is already pending for that email.');
      return;
    }
    setInviting(true);
    try {
      const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(SUPABASE_URL + '/rest/v1/shop_invites', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          shop_id: shopId,
          email,
          role: inviteRole,
          token: genToken(),
          status: 'pending',
          expires_at: expires,
        }),
      });
      if (!res.ok) {
        setInviteMsg(res.status === 403 ? 'Only the shop owner can invite team members.' : 'Could not send the invite. Please try again.');
        setInviting(false);
        return;
      }
      setInviteEmail('');
      setInviteMsg('Invite created. Your teammate will receive an email to join.');
      load();
    } catch {
      setInviteMsg('Could not send the invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const toggleMember = async (m: Member, makeActive: boolean) => {
    setBusyMember(m.user_id);
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/set_member_active', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user: m.user_id, make_active: makeActive }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((x) => (x.user_id === m.user_id ? { ...x, active: makeActive } : x)));
      }
    } catch {
      /* leave state as-is on failure */
    } finally {
      setBusyMember(null);
    }
  };

  const card: React.CSSProperties = { background: 'white', border: '1px solid #E0E0E0', borderRadius: 16, padding: 20, marginBottom: 20 };
  const pill = (bg: string, color: string): React.CSSProperties => ({ display: 'inline-block', background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 });

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/app/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: teal, textDecoration: 'none', marginBottom: 16 }}>
        <ChevronLeft size={16} /> Settings
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: navy }}>Team</h1>
        <button onClick={load} title="Refresh" style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
          <RefreshCw size={16} color={teal} />
        </button>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#888', fontSize: 14 }}>Loading team…</div>
      ) : loadError ? (
        <div style={{ ...card, textAlign: 'center', color: '#C0392B', fontSize: 14 }}>{loadError}</div>
      ) : (
        <>
          {/* Members */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: navy }}>Members ({members.length})</p>
            {members.map((m, i) => {
              const canToggle = isOwner && !m.is_owner && DEACTIVATABLE.has(m.role);
              return (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid #F0F0F0' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${navy}, ${teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{m.email.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, color: navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      {m.is_owner ? <span style={pill('#FCEEDB', '#B26B00')}>Owner</span> : <span style={pill('#EEF2F8', navy)}>{m.role}</span>}
                      {!m.active && <span style={pill('#F2DEDE', '#A33')}>Inactive</span>}
                    </div>
                  </div>
                  {canToggle && (
                    <button
                      onClick={() => toggleMember(m, !m.active)}
                      disabled={busyMember === m.user_id}
                      style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: m.active ? '#A33' : teal, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {busyMember === m.user_id ? '…' : m.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isOwner ? (
            <>
              {/* Invite */}
              <div style={card}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: navy, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={15} color={teal} /> Invite a teammate
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="mechanic@email.com"
                    style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 14 }}
                  />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 14 }}>
                    <option value="technician">Technician</option>
                    <option value="member">Member</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={inviting}
                    style={{ background: teal, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {inviting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
                {inviteMsg && <p style={{ margin: '10px 0 0', fontSize: 13, color: inviteMsg.startsWith('Invite created') ? '#2E7D32' : '#C0392B' }}>{inviteMsg}</p>}
              </div>

              {/* Pending invites */}
              {invites.length > 0 && (
                <div style={card}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: navy, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={15} color={teal} /> Invites
                  </p>
                  {invites.map((inv, i) => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid #F0F0F0' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, color: navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>{inv.role}</p>
                      </div>
                      <span style={pill(inv.status === 'pending' ? '#EEF2F8' : inv.status === 'accepted' ? '#DEF2E0' : '#F0F0F0', inv.status === 'accepted' ? '#2E7D32' : navy)}>{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, color: '#666', fontSize: 13 }}>
              <Shield size={16} color={teal} />
              Your team is managed by your shop owner. Contact them to add or remove members.
            </div>
          )}
        </>
      )}
    </div>
  );
}
