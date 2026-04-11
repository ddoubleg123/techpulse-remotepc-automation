'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import Sidebar from './sidebar';
import Header from './header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    if (token && email) {
      signIn({ id: '1', email, name: email.split('@')[0] }, token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-page)' }}>
      <Sidebar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0, overflow:'hidden' }}>
        <Header />
        <main style={{ flex:1, display:'flex', minHeight:0, overflow:'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
