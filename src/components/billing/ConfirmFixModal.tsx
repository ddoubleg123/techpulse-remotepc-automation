'use client';

/**
 * ConfirmFixModal — modal shown when a tech clicks "Confirm Fix" on a case.
 *
 * Collects:
 *   - what_fixed_it (required)
 *   - lesson_learned (required)
 *
 * On submit, fires TWO POSTs in parallel:
 *   1. /api/confirm-case   — writes confirmed_correct row to diagnostic_case_studies
 *   2. /api/save-case      — writes case study + cheat sheet + storage bucket,
 *                            and triggers Auto-TSB at 10 matching cases.
 *
 * Both fire on every confirm — confirm-case is the row PATCH, save-case
 * is the learning-loop write. Per Mike's flowchart May 30, 2026.
 */

import { useState } from 'react';
import {
  postConfirmCase,
  postSaveCase,
  buildCheatSheetStub,
  type ConfirmCasePayload,
  type SaveCasePayload,
} from '@/lib/techpulseApi';
import { transcriptToHTML, transcriptToText, type ChatMessage } from '@/lib/transcript';

export interface ConfirmFixModalProps {
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
  diagnosis: string;           // Synth's diagnosis text (for save-case)
  conclusion?: string;         // Optional summary; defaults to "Confirmed resolved"
  messages: ChatMessage[];     // Full conversation, for transcript fields

  token?: string;              // Bearer token if API requires auth
}

export function ConfirmFixModal({
  open,
  onClose,
  onSuccess,
  unid,
  year,
  make,
  model,
  dtc_codes,
  complaint,
  diagnosis,
  conclusion,
  messages,
  token,
}: ConfirmFixModalProps) {
  const [whatFixedIt, setWhatFixedIt] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);

    // Guard: both fields required (per flowchart Phase 2)
    if (!whatFixedIt.trim() || !lessonLearned.trim()) {
      setError('Both fields are required before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      const transcript_html = transcriptToHTML(messages, 30);
      const conversation_text = transcriptToText(messages);

      const confirmPayload: ConfirmCasePayload = {
        year,
        make,
        model,
        dtc_codes,
        complaint,
        what_fixed_it: whatFixedIt.trim(),
        lesson_learned: lessonLearned.trim(),
        transcript_html,
      };

      const cheat = buildCheatSheetStub({
        year,
        make,
        model,
        dtc_codes,
        complaint,
        fix: whatFixedIt.trim(),
      });

      const savePayload: SaveCasePayload = {
        unid,
        conversation_text,
        year,
        make,
        model,
        dtc_codes,
        complaint,
        diagnosis,
        fix: whatFixedIt.trim(),
        conclusion: conclusion || 'Confirmed resolved',
        cheat_sheet_title: cheat.cheat_sheet_title,
        cheat_sheet_content: cheat.cheat_sheet_content,
      };

      // Fire both in parallel per the flowchart (Phase 3 + Phase 4/5 chain).
      await Promise.all([
        postConfirmCase(confirmPayload, token),
        postSaveCase(savePayload, token),
      ]);

      setSubmitting(false);
      setWhatFixedIt('');
      setLessonLearned('');
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
          Confirm Fix
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
          Help Synth get smarter — what actually fixed it, and what should the next tech know?
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          What fixed it
        </label>
        <textarea
          value={whatFixedIt}
          onChange={(e) => setWhatFixedIt(e.target.value)}
          placeholder="e.g. Replaced PCV valve"
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
          Lesson learned
        </label>
        <textarea
          value={lessonLearned}
          onChange={(e) => setLessonLearned(e.target.value)}
          placeholder="e.g. Check PCV before chasing vacuum leaks"
          rows={3}
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
              background: '#16a34a',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
