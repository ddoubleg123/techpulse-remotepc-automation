'use client';

/**
 * UnconfirmFixModal — modal shown when a tech clicks "Unconfirm Fix" / "Inaccurate".
 *
 * Collects:
 *   - what_synth_said    (at least one of these two required per flowchart)
 *   - what_fixed_it
 *   - tech_notes (optional)
 *
 * On submit, fires ONE POST:
 *   /api/save-not-helpful — writes synth_corrections + mistake_log,
 *                            which the KB gate picks up on the next matching case.
 *
 * Per Mike's flowchart May 30, 2026.
 */

import { useState } from 'react';
import {
  postSaveNotHelpful,
  type SaveNotHelpfulPayload,
} from '@/lib/techpulseApi';
import { transcriptToHTML, type ChatMessage } from '@/lib/transcript';

export interface UnconfirmFixModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;

  // Case context
  unid: string;
  year: number;
  make: string;
  model: string;
  dtc_codes: string[];
  complaint: string;
  messages: ChatMessage[];

  // Attachments collected during the session (images/PDFs).
  // Max 3MB total per flowchart — caller is responsible for enforcing.
  attachments?: Array<{ name: string; mime: string; data_base64: string }>;

  token?: string;
}

export function UnconfirmFixModal({
  open,
  onClose,
  onSuccess,
  unid,
  year,
  make,
  model,
  dtc_codes,
  complaint,
  messages,
  attachments,
  token,
}: UnconfirmFixModalProps) {
  const [whatSynthSaid, setWhatSynthSaid] = useState('');
  const [whatFixedIt, setWhatFixedIt] = useState('');
  const [techNotes, setTechNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);

    // Guard: at least one of the two main fields must be filled (per flowchart Phase 3).
    if (!whatSynthSaid.trim() && !whatFixedIt.trim()) {
      setError('Please fill in at least one of the two fields below.');
      return;
    }

    setSubmitting(true);
    try {
      const transcript_html = transcriptToHTML(messages, 30);
      const vehicle = `${year} ${make} ${model}`.trim();

      const payload: SaveNotHelpfulPayload = {
        unid,
        vehicle,
        year,
        make,
        model,
        complaint,
        dtc_codes,
        what_synth_said: whatSynthSaid.trim(),
        what_fixed_it: whatFixedIt.trim(),
        tech_notes: techNotes.trim() || undefined,
        transcript_html,
        attachments: attachments && attachments.length > 0 ? attachments : [],
      };

      await postSaveNotHelpful(payload, token);

      setSubmitting(false);
      setWhatSynthSaid('');
      setWhatFixedIt('');
      setTechNotes('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError((err as Error).message);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          width: '90%',
          maxWidth: 520,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
          Not Helpful
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Help Synth learn from this — what did it get wrong, and what actually fixed it?
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          What did Synth get wrong?
        </label>
        <textarea
          value={whatSynthSaid}
          onChange={(e) => setWhatSynthSaid(e.target.value)}
          placeholder="e.g. Pointed at MAF sensor"
          rows={2}
          disabled={submitting}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 14,
            fontFamily: 'inherit',
            marginBottom: 16,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          What actually fixed it?
        </label>
        <textarea
          value={whatFixedIt}
          onChange={(e) => setWhatFixedIt(e.target.value)}
          placeholder="e.g. PCV hose was the real cause"
          rows={2}
          disabled={submitting}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 14,
            fontFamily: 'inherit',
            marginBottom: 16,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Notes (optional)
        </label>
        <textarea
          value={techNotes}
          onChange={(e) => setTechNotes(e.target.value)}
          placeholder="Anything else you want Mike to see"
          rows={2}
          disabled={submitting}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: 14,
            fontFamily: 'inherit',
            marginBottom: 16,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: 10,
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit & Clear'}
          </button>
        </div>
      </div>
    </div>
  );
}
