import { redirect } from 'next/navigation';

// Legacy route — superseded by the 5-step diagnostic flow at /app/chat.
// Replaced with a redirect so any stale bookmark or external link lands
// gracefully on the production diagnostic.
export default function LegacyDiagnosticChatRedirect() {
  redirect('/app/chat');
}
