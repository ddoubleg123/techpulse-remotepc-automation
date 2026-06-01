/**
 * Demo accounts. Sign-ins from these emails are treated as demo mode:
 *  - Onboarding modal is bypassed
 *  - Reports / Cases / Dashboard scope to source='demo' rows
 *  - /api/confirm-case rejects promotions from these accounts
 *  - DemoBanner renders at the top of every /app/* route
 *
 * Single source of truth for the email list. Import isDemoEmail / DEMO_EMAILS
 * rather than hardcoding the list in any component.
 */
export const DEMO_EMAILS: ReadonlyArray<string> = [
  'daniel@techpulse.dev',
  'candice@techpulse.dev',
  'raj@techpulse.dev',
];

export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAILS.includes(email.trim().toLowerCase());
}

export function isDemoUser(user: { email?: string | null } | null | undefined): boolean {
  return isDemoEmail(user?.email);
}
