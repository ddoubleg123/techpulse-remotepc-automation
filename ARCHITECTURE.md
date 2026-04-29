# TechPulse Platform Architecture & Technical Reference

**Last updated:** 2026-04-29
**Status:** Living document — replaces TechPulse_Architecture.docx (April 2026 v1)

---

## 1. Platform overview

TechPulse is an AI-powered automotive diagnostic platform for independent auto
repair shops. The AI engine, Synth, is trained on 6,000+ real diagnostic cases
documented by Mike Munson, a 45-year master technician.

- **Tagline:** Faster diagnostics. Smarter technicians.
- **Business model:** $375/month SaaS per shop
- **Current traction:** 11 paying shops, $43K ARR, 80%+ retention

---

## 2. Services

TechPulse runs as **three production services + one repository for AI agents**.

| Service | Repository | Live URL | Owner |
|---|---|---|---|
| Web App (Next.js 16) | `ddoubleg123/techpulse-remotepc-automation` (main) | techpulse-remotepc-automation.onrender.com | Daniel |
| Synth API (Flask/Python) | `ddoubleg123/techpulse-api` (master) | techpulse-api.onrender.com | Daniel ops + Mike code |
| Connector + Mobile | `sidd07181134/techpulse-app` (private) | techpulse-app.onrender.com | Sidd |
| AI Agents (definitions) | `atrguide/techpulse-agents` (private) | n/a | Mike + Adriatik |

**Auth API (sync-api)** lives in `ddoubleg123/techpulse-sync-api` and runs at
techpulse-sync-api.onrender.com. **Scheduled for retirement under G4** (5-week
migration to Supabase Auth). When G4 Phase 4 completes, the service is deleted
and the repo archived. Do not invest in sync-api beyond critical fixes.

---

## 3. Infrastructure

### 3.1 Render
All services run on Render with auto-deploy on push to the configured branch.

| Service | Render service ID | Runtime | Branch |
|---|---|---|---|
| Web App | srv-d76kglf5r7bs73c8mh1g | Node.js | main |
| Synth API | srv-d7bskonkijhs73avfilg | Python 3 | master |
| Sync API | (in dashboard) | Node.js | main |
| Connector (Sidd's account) | (Sidd's dashboard) | Node.js | main |
| Redis | red-d66d6m7gi27c738cuiv0 | Valkey 8 | n/a |

Render free tier spins down services after 15 min idle. Cold start ~30-60s.
Web app pre-warms Synth with a `/health` ping on page load.

### 3.2 Supabase
- **URL:** `https://fcqejcrxtrqdxybgyueu.supabase.co`
- **Project:** Techpulse (Pro tier)
- **Stores:** user authentication, diagnostic conversation records, payment
  records, Mike's case-study training corpus
- Both web and mobile share the same Supabase instance

### 3.3 Redis
- Internal URL: `redis://red-d66d6m7gi27c738cuiv0:6379`
- Used by Synth API for conversation memory (multi-turn per session_id)
- Internal Render network only

### 3.4 Anthropic
- Model: `claude-sonnet-4-20250514`
- PDFs sent as native base64 document blocks; Claude reads them directly

### 3.5 Stripe
- Implemented on the connector (techpulse-app.onrender.com)
- Web billing wired to the same connector endpoints
- Stripe secret key lives server-side on Sidd's connector only

---

## 4. Web app

### 4.1 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| State | Zustand (auth-storage in localStorage) |
| Styling | CSS custom properties + inline styles |
| Hosting | Render (Node.js) |

### 4.2 Key files

| File | Purpose |
|---|---|
| `src/app/app/chat/page.tsx` | 5-step diagnostic flow (~66KB; see G6 for split plan) |
| `src/app/app/billing/page.tsx` | Stripe billing |
| `src/app/app/tickets/page.tsx` | Tickets page |
| `src/app/auth/login/page.tsx` | Currently sync-api OAuth — migrating to Supabase Auth in G4 |
| `src/components/layout/app-layout.tsx` | Root layout (only wraps `/app/**` routes) |
| `src/stores/authStore.ts` | Zustand auth store |

### 4.3 The 5-step diagnostic flow

| Step | What it does |
|---|---|
| 1 | Vehicle / VIN + scanner file upload (PDF as base64 to Synth) |
| 2 | DTC codes + symptoms (auto-extracted from text uploads) |
| 3 | Diagnose — chat with Synth, auto-sends vehicle/codes/symptoms/PDF |
| 4 | Report — TechPulse Diagnostic PDF rendered server-side (WeasyPrint) |
| 5 | Confirm — Accurate/Partial/Inaccurate + Repaired/Not yet (trains Synth) |

### 4.4 Authentication flow (CURRENT)

```
User clicks "Sign In with Google"
  → techpulse-sync-api.onrender.com/api/auth/google
  → Google OAuth
  → Redirects back with ?token=<opaque>&email=<email>
  → app-layout.tsx → signIn() → stored in Zustand
  → All Synth calls use NEXT_PUBLIC_SYNTH_API_TOKEN (T1) as bearer
```

### 4.5 Authentication flow (POST-G4 — target state)

```
User clicks "Sign In with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → Browser redirects to Supabase project's OAuth callback
  → Supabase redirects to /auth/callback in web app with ?code=
  → /auth/callback page calls supabase.auth.exchangeCodeForSession(code)
  → Supabase returns { session: { access_token (JWT), refresh_token, user } }
  → Session stored in Zustand
  → Synth API calls continue using T1 (sync-api retired by Phase 4)
```

See `G4_Implementation_Plan.md` for migration timeline (5 weeks, 4 phases).

---

## 5. Synth API

### 5.1 Stack

| Layer | Technology |
|---|---|
| Framework | Flask (Python) |
| AI engine | Anthropic SDK (Claude Sonnet 4) |
| Session memory | Redis |
| Hosting | Render (Python 3) |
| Branch | `master` (not main) |
| PDF rendering | **WeasyPrint** (post-2026-04-29; was xhtml2pdf) |

### 5.2 Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{status, version, engine, pdf_support}` |
| POST | `/api/diagnostic` | Main diagnostic endpoint |
| POST | `/api/diagnostic/stream` | Same, returns SSE format |

### 5.3 Request format

```json
{
  "session_id": "uuid",
  "message": "text from user",
  "vehicle": { "year": "", "make": "", "model": "", "engine": "", "vin": "" },
  "pdf_base64": "base64-encoded PDF bytes",
  "pdf_name": "filename.pdf"
}
```

### 5.4 Response format

Server-Sent Events:

```
data: {"text": "First chunk of response"}
data: {"text": " second chunk"}
data: [DONE]
```

### 5.5 Authentication (3-tier token system)

| Token | Variable | Who uses it | Access level |
|---|---|---|---|
| T1 | `API_TOKEN_T1` | Sidd (mobile) + Daniel (web) | Customer — restricted Synth |
| T2 | `API_TOKEN_T2` | Adriatik (dev testing) | Developer — full capability |
| T3 | `API_TOKEN_T3` | Mike only | Admin — unrestricted Synth |

### 5.6 PDF rendering — WeasyPrint

Per Mike's Decision 1 on 2026-04-29: **WeasyPrint replaces xhtml2pdf** as the
canonical web PDF renderer. WeasyPrint honors the locked CSS standards
(flexbox, gradients, border-radius, page-break-inside) that xhtml2pdf could
not render.

The agent system prompt at `atrguide/techpulse-agents/Agent coding backup/pdf-agent.md`
defines the HTML/CSS shape Synth produces. WeasyPrint renders it to PDF.

`atrguide/techpulse-agents/Python Engine/pdf_generator.py` is a **ReportLab**
renderer that runs on Mike's Windows machine for local agent-generated PDFs.
**It is not the web platform renderer.** Don't conflate the two.

### 5.7 Schema

`public.diagnostic_reports` is the canonical diagnostic-record table.

- **14 columns:** id, conversation_id, customer_id, vehicle_info, dtc_codes,
  symptoms, diagnosis, root_cause, resolution, laws_applied, cost_saved,
  status, created_at, updated_at
- **RLS enabled, 4 policies:** service_role full / authenticated read/insert/
  update own (matched on `customer_id = auth.uid()`)
- **Self-healing:** Synth API's `_ensure_schema()` re-creates the table at
  startup if it's ever dropped

Renamed from `diagnostic_sessions` on 2026-04-29 as part of G1 schema
consolidation. The legacy tables `diagnostic_files` and `ai_analysis_jobs`
were dropped at the same time.

`public.diagnostic_case_studies` (1,367 rows as of 2026-04-29) is Mike's
training corpus. Untouched by G1.

---

## 6. Mobile + Connector

### 6.1 Stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo |
| Connector API | Flask (Python) |
| Connector URL | techpulse-app.onrender.com |
| Repo | `sidd07181134/techpulse-app` (private) |

### 6.2 Connector endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Synth chat (mobile route) |
| GET | `/api/billing/status` | Current subscription |
| GET | `/api/billing/plans` | Available plans |
| POST | `/api/billing/checkout-session` | Create Stripe checkout URL |
| GET | `/api/extract-document` | Extract text from document |
| POST | `/api/profile/update` | Update user profile |

### 6.3 G2 — open question

The connector currently runs a parallel agentic stack (own conductor, TSB live
search, Python engine, PDF generator). **The Gap Analysis G2 question is
unresolved** — collapse to thin proxy, formalize the split, or hybrid? Sidd's
call. Pending Week 2 alignment meeting.

---

## 7. End-to-end flows

### 7.1 Web app diagnostic flow

```
Browser
  → POSTs to techpulse-api.onrender.com/api/diagnostic/stream
     Authorization: Bearer T1
     Body: { session_id, message, vehicle, pdf_base64, pdf_name }
  ← Synth streams SSE: data: {"text": "..."}
  → Report rendered (WeasyPrint, server-side)
  → Feedback persisted to public.diagnostic_reports
```

### 7.2 Mobile app diagnostic flow

```
Mobile App
  → POSTs to techpulse-app.onrender.com/api/chat
     (Sidd's connector — runs its own conductor; see G2)
  ← SSE response streamed back
```

### 7.3 Billing flow (both platforms)

```
Web/Mobile
  → GET /api/billing/{status,plans}      (Sidd's connector)
  → POST /api/billing/checkout-session   → returns Stripe URL
  → Browser redirects to Stripe
  → Stripe webhook updates Supabase subscriptions table
```

---

## 8. Locked Rules (current — as of 2026-04-29)

| # | Rule | Status |
|---|---|---|
| 1 | PDF pipeline + requirements.txt require Mike review | Active |
| 2 | PDF renderer is **WeasyPrint** (was xhtml2pdf — changed 2026-04-29 per Mike's Path 2 ruling) | Active — UPDATED |
| 3 | Locked sections in app.py: REPORT_FINAL_RE, run_diagnostic_pipeline(), 4 imports from pdf_generator, streaming PDF routing | Active |
| 4 | Pages under /app/ cannot be wrapped in `<AppLayout>` (already wrapped by app/app/layout.tsx) | Active — verified for tickets/page.tsx 2026-04-29 |
| 5 | 3-tier token system (T1/T2/T3) | Active |
| 6 | Web app may use @supabase/supabase-js for **auth flow only** — never for diagnostic data writes (rescoped 2026-04-29 from outright ban per Mike's Decision 2) | Active — UPDATED |

---

## 9. Environment variables

### 9.1 Web App (techpulse-remotepc-automation on Render)

| Variable | Value / Source |
|---|---|
| `NEXT_PUBLIC_SYNTH_API_TOKEN` | T1 token value |
| `NEXT_PUBLIC_SUPABASE_URL` | (added in G4 Phase 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (added in G4 Phase 1) |

### 9.2 Synth API (techpulse-api on Render)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `API_TOKEN_T1`, `T2`, `T3` | Tier tokens |
| `REDIS_URL` | Internal Render Redis URL |
| `OPENAI_API_KEY` | (Pending — needed for synth_search.py) |

---

## 10. Contacts and access

| Person | Role | GitHub | What they control |
|---|---|---|---|
| Michael Munson | Founder & CEO | (ask Mike) | Synth code on local machine, API tokens, agentic loop |
| Daniel Gouldman | Co-founder & CRO | @ddoubleg123 | Web app, Synth API on Render, Auth API, Supabase |
| Sidd | Mobile Developer | @sidd07181134 | Mobile app, connector API, Stripe |
| Adriatik | Engineering, agent definitions, Synth review | @atrguide (review) and @adriatikgashi (build) | atrguide/techpulse-agents repo; Synth code reviewer; Python engine modules |
| Candice Elsmore | Co-founder & COO/CFO | n/a | Business operations |

**Note on Adriatik's two GitHub accounts (G15):** `@atrguide` is used for
review/audit/repo-namespacing; `@adriatikgashi` is used for active development
commits. Both are listed in CODEOWNERS files where his review is required.

---

## 11. Outstanding strategic items (as of 2026-04-29)

| # | Item | Status |
|---|---|---|
| G2 | Mobile track decision | Pending Week 2 alignment meeting |
| G3 | PDF unification — execute Path 2 | Mike approved; ready to plan |
| G4 | Web auth migration to Supabase Auth | Mike rescoped Rule #6; 5-week plan ready |
| G5 | Chat history primary in Supabase | Wait for G2 |
| G6 | Split chat/page.tsx | Wait for G2 |
| G14 | Supply chain SHA pinning | Sidd-owned |

---

## 12. Decommissioned services (history)

(none yet — sync-api retirement begins post-G4 Phase 1)

---

*This document supersedes TechPulse_Architecture.docx (April 2026 v1). Living document — update whenever architecture changes.*
