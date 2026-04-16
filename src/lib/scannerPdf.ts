/**
 * Scanner PDF → Synth: read base64 only at step commit (button click), not on upload.
 * See TechPulse architecture Section 9.
 */

export const MAX_SCANNER_PDF_BYTES = 10 * 1024 * 1024;

export function getPdfSizeViolationMessage(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.pdf')) return null;
  if (file.size > MAX_SCANNER_PDF_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `PDF must be ${MAX_SCANNER_PDF_BYTES / (1024 * 1024)}MB or smaller (this file is ${mb}MB).`;
  }
  return null;
}

export function assertAcceptableScannerPdf(file: File): void {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.pdf')) {
    throw new Error('Please choose a PDF file.');
  }
  const sizeMsg = getPdfSizeViolationMessage(file);
  if (sizeMsg) throw new Error(sizeMsg);
}

export function readPdfAsRawBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const r = fr.result;
      if (typeof r !== 'string') {
        reject(new Error("Couldn't read PDF, try re-uploading."));
        return;
      }
      const comma = r.indexOf(',');
      if (comma === -1) {
        reject(new Error("Couldn't read PDF, try re-uploading."));
        return;
      }
      const raw = r.slice(comma + 1);
      if (!raw.length) {
        reject(new Error("Couldn't read PDF, try re-uploading."));
        return;
      }
      resolve(raw);
    };
    fr.onerror = () => reject(new Error("Couldn't read PDF, try re-uploading."));
    fr.onabort = () => reject(new Error("Couldn't read PDF, try re-uploading."));
    fr.readAsDataURL(file);
  });
}
