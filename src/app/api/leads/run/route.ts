// POST /api/leads/run
// Server-side proxy to the techpulse-leadgen Render service.
//
// Why this exists:
//   - Keeps LEADGEN_TOKEN server-side (never shipped to the browser).
//   - Same-origin, so no CORS between app.techpulse.dev and the leadgen host.
//   - One place to set generous timeouts for the free-tier cold start.
//
// Requires env vars on the web app's Render service:
//   LEADGEN_URL    e.g. https://techpulse-leadgen.onrender.com
//   LEADGEN_TOKEN  shared secret gating the leadgen endpoints
//
// Admin auth: this route trusts that it is only reachable from the admin UI,
// but still re-checks the caller is an admin via requireAdmin() so it can't be
// hit by a logged-in non-admin who guesses the path.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

type Action = 'discovery' | 'discovery_all' | 'enrichment' | 'stats';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const LEADGEN_URL = (process.env.LEADGEN_URL || '').replace(/\/$/, '');
  const LEADGEN_TOKEN = process.env.LEADGEN_TOKEN || '';
  if (!LEADGEN_URL || !LEADGEN_TOKEN) {
    return NextResponse.json(
      { error: 'LEADGEN_URL or LEADGEN_TOKEN not configured on the server' },
      { status: 503 }
    );
  }

  let body: { action?: Action; county?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, county, limit } = body;

  // Build the upstream URL for the requested action.
  let path = '';
  const params = new URLSearchParams({ token: LEADGEN_TOKEN });
  switch (action) {
    case 'discovery':
      if (!county) {
        return NextResponse.json({ error: 'county required for discovery' }, { status: 400 });
      }
      path = '/run/discovery';
      params.set('county', county);
      break;
    case 'discovery_all':
      path = '/run/discovery/all';
      break;
    case 'enrichment':
      path = '/run/enrichment';
      params.set('limit', String(limit || 50));
      break;
    case 'stats':
      path = '/stats';
      break;
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const url = `${LEADGEN_URL}${path}?${params.toString()}`;

  // Discovery across a county can take minutes; allow a long timeout. The free
  // tier may also cold-start (30-60s). AbortController caps the wait so the
  // route can't hang forever.
  const controller = new AbortController();
  const timeoutMs = action === 'discovery_all' ? 280_000 : 180_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Leadgen service returned HTTP ${res.status}`, detail: data },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, action, result: data });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      {
        error: aborted
          ? 'Leadgen request timed out (the job may still be running — check stats in a moment)'
          : `Leadgen request failed: ${e instanceof Error ? e.message : 'unknown'}`,
      },
      { status: aborted ? 504 : 502 }
    );
  }
}
