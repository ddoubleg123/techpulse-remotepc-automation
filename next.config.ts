import type { NextConfig } from "next";

// Security headers. The first group are safe, non-breaking hardening.
// CSP is intentionally Report-Only for now: it logs violations without blocking,
// so it can be tuned against the real app (Synth API, Supabase, storage images)
// before being switched to enforcing. Flipping to enforce = rename the header to
// "Content-Security-Policy".
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://fcqejcrxtrqdxybgyueu.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://fcqejcrxtrqdxybgyueu.supabase.co https://techpulse-api.onrender.com https://techpulse-sync-api.onrender.com https://techpulse-app.onrender.com https://dev.synthassist.ai",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
