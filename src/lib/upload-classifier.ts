/**
 * upload-classifier.ts — TechPulse web app
 *
 * Classifies an uploaded file as a real PDF (base64) or text content.
 * Verifies BOTH file extension AND magic bytes — prevents .pids, .txt,
 * .csv, or any other non-PDF file from being sent to the Synth API in
 * the pdf_base64 field, which would trigger an Anthropic 400:
 *   "messages.N.content.0.pdf.source.base64.data: The PDF specified was not valid"
 */

export type ClassifiedUpload =
  | { kind: 'pdf'; base64: string; filename: string; size: number }
  | { kind: 'text'; content: string; filename: string; size: number }
  | { kind: 'empty' };

/** Base64 of "%PDF-" — every real PDF starts with this when base64-encoded. */
export const PDF_BASE64_PREFIX = 'JVBERi0';

/** Cheap sanity check before sending pdf_base64 to the Synth API. */
export function isValidPdfBase64(b64: string | null | undefined): boolean {
  return !!b64 && b64.length > 8 && b64.startsWith(PDF_BASE64_PREFIX);
}

export async function classifyUpload(file: File | null): Promise<ClassifiedUpload> {
  if (!file) return { kind: 'empty' };

  const ext = file.name.toLowerCase().split('.').pop() || '';
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 5));

  // %PDF- = 0x25 0x50 0x44 0x46 0x2D
  const isPdfMagic =
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 &&
    head[3] === 0x46 && head[4] === 0x2D;

  if (ext === 'pdf' && isPdfMagic) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunk) as unknown as number[]
      );
    }
    return {
      kind: 'pdf',
      base64: btoa(binary),
      filename: file.name,
      size: file.size,
    };
  }

  // Everything else (.pids, .txt, .csv, .scan, .log, or a file labeled
  // .pdf that lacks the magic bytes) -> treat as text content.
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  return {
    kind: 'text',
    content: text,
    filename: file.name,
    size: file.size,
  };
}
