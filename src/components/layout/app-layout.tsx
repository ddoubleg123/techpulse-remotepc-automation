"use client";

import { useAuthStore } from "@/stores/authStore";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}