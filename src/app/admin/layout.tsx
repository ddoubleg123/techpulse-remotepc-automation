import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';

// Never prerender/cache the admin shell — the gate must run on every request.
export const dynamic = 'force-dynamic';

// Server component: authoritative admin gate. Runs before any /admin page
// renders. Non-admins (or unconfigured/!valid sessions) are redirected to /app.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect('/app');
  return <>{children}</>;
}
