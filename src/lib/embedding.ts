// src/lib/embedding.ts
// Shared embedding generation for the confirm-case / save-case routes.
//
// Per Mike (June 24, 2026): embeddings use OpenAI text-embedding-3-small
// (vector(1536)). The input text is the concatenation of
// complaint + diagnosis + fix + conclusion. Do not change the model or the
// dimension — the diagnostic_case_studies.embedding column is vector(1536) and
// every existing case shares that space; mixing models breaks vector search.
//
// OPENAI_API_KEY is read from the environment (set on Render, never hardcoded).

export interface EmbeddingInput {
  complaint?: string | null;
  diagnosis?: string | null;
  fix?: string | null;
  conclusion?: string | null;
}

export function buildEmbeddingText(parts: EmbeddingInput): string {
  return [parts.complaint, parts.diagnosis, parts.fix, parts.conclusion]
    .filter((s) => s && String(s).trim())
    .join('\n\n')
    .trim();
}

export type EmbeddingResult =
  | { ok: true; embedding: number[] }
  | { ok: false; status: number; error: string };

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  if (!OPENAI_API_KEY) {
    return { ok: false, status: 503, error: 'OPENAI_API_KEY not configured' };
  }
  if (!text || text.length < 10) {
    return { ok: false, status: 400, error: 'Insufficient text to embed' };
  }
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // model handles ~8191 tokens; ~8k chars is safe
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, status: 502, error: `OpenAI embedding HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      return { ok: false, status: 502, error: `Expected 1536-dim embedding, got ${Array.isArray(embedding) ? embedding.length : 'none'}` };
    }
    return { ok: true, embedding };
  } catch (e) {
    return { ok: false, status: 502, error: `OpenAI call failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}
