/**
 * Transcript formatters for the confirm/unconfirm payloads sent to
 * the TechPulse Synth API.
 *
 *  - transcriptToHTML: last N messages as <tr> rows, for /api/confirm-case
 *    and /api/save-not-helpful (transcript_html field).
 *  - transcriptToText: plain "TECH: ... / SYNTH: ..." string, for
 *    /api/save-case (conversation_text field).
 */

export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
  timestamp?: string | number | Date;
}

const DEFAULT_LIMIT = 30;

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function speakerLabel(role: Role): string {
  if (role === 'assistant') return 'SYNTH';
  if (role === 'user') return 'TECH';
  return 'SYSTEM';
}

/**
 * Format the last `limit` messages as HTML <tr> rows.
 * Returns a string of concatenated <tr>...</tr> rows (no <table> wrapper —
 * the server payload field is `transcript_html` and Mike's example shows
 * "<tr>...</tr>" content).
 */
export function transcriptToHTML(messages: ChatMessage[], limit: number = DEFAULT_LIMIT): string {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  const slice = messages.slice(-limit);
  return slice
    .map((m) => {
      const who = speakerLabel(m.role);
      const text = escapeHTML(m.content ?? '').replace(/\n/g, '<br>');
      return `<tr><td><strong>${who}</strong></td><td>${text}</td></tr>`;
    })
    .join('');
}

/**
 * Format the full conversation as plain text for /api/save-case.
 * Shape: "TECH: ...\nSYNTH: ...\nTECH: ..."
 */
export function transcriptToText(messages: ChatMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  return messages
    .map((m) => `${speakerLabel(m.role)}: ${m.content ?? ''}`)
    .join('\n');
}
