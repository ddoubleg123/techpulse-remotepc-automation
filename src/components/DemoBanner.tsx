'use client';

import { useAuthStore } from '@/stores/authStore';
import { isDemoUser } from '@/lib/demoUsers';

/**
 * Persistent top-of-page banner shown when the signed-in user is a demo account.
 * Visible across every /app/* route via app-layout.tsx integration.
 */
export default function DemoBanner() {
  const user = useAuthStore((s: any) => s.user);
  if (!isDemoUser(user)) return null;
  return (
    <div
      role="banner"
      aria-label="Demo mode"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        padding: '10px 20px',
        background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
        color: '#1c1917',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.2,
        textAlign: 'center',
        boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <span aria-hidden="true">🎬</span>
      <span>Demo Mode — TechPulse Demo Shop · Data is sandboxed and resets on request</span>
    </div>
  );
}
