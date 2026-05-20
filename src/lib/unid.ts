// UNID (Unique Case ID) generator and session helper.
// Format: TECH-YYYYMMDD-HHmmss-XXXX where XXXX is a 4-char random alphanumeric
// suffix to avoid collisions when two techs at the same shop submit in the same
// second. Matches Mike's pipeline guardrail in TechPulse_Data_Strategy_Overview.

const SESSION_KEY = 'synth-session-id';
const UNID_PATTERN = /^TECH-\d{8}-\d{6}-[a-z0-9]{4}$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function generateUnid(): string {
  const now = new Date();
  const date = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const time = '' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
  // 4 alphanumeric chars from base36 random. Math.random suffices for shop-level
  // collision avoidance — cryptographic randomness is not required here.
  const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return 'TECH-' + date + '-' + time + '-' + suffix;
}

export function isValidUnid(s: string | null | undefined): boolean {
  return !!s && UNID_PATTERN.test(s);
}

// Returns the current session's UNID. Creates and persists one if missing or if
// the stored value isn't a UNID (e.g. a legacy UUID from before this migration).
export function getOrCreateSessionUnid(): string {
  if (typeof window === 'undefined') return generateUnid();
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (isValidUnid(stored)) return stored as string;
    const fresh = generateUnid();
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return generateUnid();
  }
}

// Forces a new UNID and persists it. Use when starting a brand-new case.
export function rotateSessionUnid(): string {
  const fresh = generateUnid();
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(SESSION_KEY, fresh); } catch {}
  }
  return fresh;
}
