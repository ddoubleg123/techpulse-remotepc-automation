"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signIn } = useAuthStore();
  const router = useRouter();

  // Catch token+email from auth API Google OAuth redirect (?token=...&email=...)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const token = p.get('token');
    const em = p.get('email');
    if (token && em && !user) {
      try {
        const pl = JSON.parse(atob(token));
        signIn({ id: pl.userId || '1', email: em, name: em.split('@')[0], hasPaymentMethodOnFile: false }, token);
        // Clean up URL params without reload
        window.history.replaceState({}, '', '/app');
      } catch {
        router.push('/auth/login');
      }
    }
  }, [user, signIn, router]);

  // Not authenticated and no token in URL -> redirect to login
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!user && !p.get('token')) router.push('/auth/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
