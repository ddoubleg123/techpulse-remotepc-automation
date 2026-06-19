import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';
import AdminShell from '@/components/admin/AdminShell';

// Never prerender/cache the admin shell — the gate must run on every request.
export const dynamic = 'force-dynamic';

// Server component: authoritative admin gate, then the persistent admin chrome
// (sidebar + header) that wraps every /admin page.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect('/app');
  return <AdminShell>{children}</AdminShell>;
}
