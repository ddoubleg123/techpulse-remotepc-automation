import { redirect } from 'next/navigation';

// Legacy route — superseded by the 5-step diagnostic flow at /app/chat.
// Kept as a redirect so stale bookmarks land in the right place.
export default function LegacyDiagnosticChatRedirect() {
  redirect('/app/chat');
}
