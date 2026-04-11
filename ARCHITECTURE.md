# TechPulse — Full Architecture & Session Handoff Document

**Last updated:** April 11, 2026
**Purpose:** Complete architecture reference and handoff document for new chat sessions.

---

## 1. What TechPulse Is

TechPulse is an AI-powered automotive diagnostic platform for independent auto repair shops.
The AI engine is called **Synth** — trained on 6,000+ real diagnostic cases by Mike Munson (45-year master technician).
Tagline: *"Faster diagnostics. Smarter technicians."*

**Business model:** $375/month SaaS per shop. Currently 11 paying shops, $43k ARR, 80%+ retention.

---

## 2. The Three Products

| Product | Repo | Live URL | Owner |
|---------|------|----------|-------|
| Web App | `ddoubleg123/techpulse-remotepc-automation` | `techpulse-remotepc-automation.onrender.com` | Daniel |
| Mobile App | `sidd07181134/techpulse-app` (private) | Expo / App Store (in dev) | Sidd |
| Synth API | `ddoubleg123/techpulse-api` (private) | `techpulse-api.onrender.com` | Daniel / Mike |

**Note:** There is also Sidd's connector API at `techpulse-app.onrender.com` which handles billing, extract-document, and diagnostic-report endpoints for the mobile app.

---

## 3. Infrastructure & Third-Party Services

### Render (Hosting)
All services run on Render. Auto-deploy on every GitHub push.

| Service Name | Render Service ID | URL | Repo |
|---|---|---|---|
| Web App (Next.js) | `srv-d76kglf5r7bs73c8mh1g` | `techpulse-remotepc-automation.onrender.com` | `ddoubleg123/techpulse-remotepc-automation` |
| Synth API (Flask) | `srv-d7bskonkijhs73avfilg` | `techpulse-api.onrender.com` | `ddoubleg123/techpulse-api` |
| Auth API (Node.js) | (separate service) | `techpulse-sync-api.onrender.com` | `ddoubleg123/techpulse-sync-api` |
| Sidd's Connector | (Sidd's account) | `techpulse-app.onrender.com` | `sidd07181134/techpulse-app` |

### GitHub
- Account: `ddoubleg123`
- `techpulse-remotepc-automation` — web app (public)
- `techpulse-api` — Synth Flask API (private)
- `techpulse-sync-api` — Auth API Node.js (public)
- `sidd07181134/techpulse-app` — mobile app (private, Daniel has access)

### Supabase
- URL: `https://fcqejcrxtrqdxybgyueu.supabase.co`
- Used for: user auth, diagnostic sessions, payment/subscription records
- Both web app and mobile app share the same Supabase instance
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in Render environment vars for `techpulse-api`

### Redis
- Internal Render Redis: `redis://red-d66d6m7gi27c738cuiv0:6379`
- Used by: Synth API for session storage (conversation history per session)
- Only accessible within Render's internal network

### Anthropic (Claude API)
- `ANTHROPIC_API_KEY` is set in Render for `techpulse-api`
- Model used: `claude-sonnet-4-20250514`
- The web app's chat calls `techpulse-api.onrender.com/api/diagnostic`
- PDFs are sent as base64 document blocks — Claude reads them natively

### Stripe (Billing — NOT YET WIRED ON WEB)
- Stripe is fully implemented in Sidd's mobile connector (`techpulse-app.onrender.com`)
- The mobile app uses 3 endpoints:
  - `API_ENDPOINTS.BILLING_STATUS` — GET current subscription
  - `API_ENDPOINTS.BILLING_PLANS` — GET available plans
  - `API_ENDPOINTS.BILLING_CHECKOUT_SESSION` — POST to create Stripe checkout
- The Stripe secret key lives server-side on Sidd's connector — web app never touches it directly
- **The web billing page has NOT been built yet** (see Section 7)

### Google OAuth
- Handled by `techpulse-sync-api.onrender.com`
- OAuth callback returns `?token=&email=` to web app
- Web app catches these params, calls `signIn()`, stores in Zustand (`auth-storage` in localStorage)

---

## 4. Web App Architecture

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, React, deployed on Render

### Key Files

```
src/
  app/
    app/
      page.tsx              — Dashboard (real ticket history, empty state, no fake stats)
      chat/page.tsx         — 5-step diagnostic flow
      billing/page.tsx      — Billing page (STUB — needs Stripe wiring)
      layout.tsx            — App layout wrapper
    auth/login/page.tsx     — Login with Google OAuth
  components/layout/
    app-layout.tsx          — Root flex layout (height:100vh, minHeight:0 chain for scroll)
    sidebar.tsx             — Nav sidebar (user card above Sign Out, white active state)
    header.tsx              — Header (no D avatar, search + bell + theme toggle)
    index.ts                — Barrel exports (all use default exports)
  stores/
    authStore.ts            — Zustand auth store (user, token, signIn, signOut)
  app/globals.css           — CSS custom properties design system (dark default, light toggle)
```

### 5-Step Diagnostic Flow (`/app/chat`)

| Step | Screen | What it does |
|------|--------|-------------|
| 1 | Vehicle / VIN + Upload | Enter VIN + Look Up, OR upload scanner file. PDFs sent as base64 to Claude natively. Text files parsed locally. |
| 2 | DTC Codes | Add fault codes, symptoms. Auto-extracted from text uploads. PDFs never leak binary here. |
| 3 | Diagnose | Chat with Synth. Auto-sends vehicle+codes+symptoms+PDF on load. Clean user bubble (no raw binary shown). |
| 4 | Report | TechPulse Diagnostic Report — vehicle, fault codes, Synth analysis, recommended actions. |
| 5 | Confirm | Accurate/Partial/Inaccurate rating + Repaired/Not Yet. Feedback trains Synth. |

---

## 5. Synth API Architecture

**Stack:** Flask (Python), Anthropic SDK, deployed on Render
**Repo:** `ddoubleg123/techpulse-api` (private, branch: `master`)

### Current State
- `app.py` is a **working** Flask server that calls Claude API directly
- Version `2.1.0` — has real Claude responses, session memory, native PDF support
- Loads `agents/prompts/synth-diagnostic-conductor.md` as system prompt
- Falls back to inline system prompt if agent files not found

### Endpoints
```
GET  /health                   — Returns {status, version, engine, pdf_support}
POST /api/diagnostic           — Main diagnostic endpoint
POST /api/diagnostic/stream    — Alias to /api/diagnostic
```

### Request Format
```json
{
  "session_id": "uuid",
  "message": "text message",
  "vehicle": { "year": "", "make": "", "model": "", "engine": "", "vin": "" },
  "pdf_base64": "base64string",
  "pdf_name": "filename.pdf"
}
```

### Environment Variables (set in Render)
```
ANTHROPIC_API_KEY     — set ✅
SUPABASE_URL          — https://fcqejcrxtrqdxybgyueu.supabase.co ✅
SUPABASE_SERVICE_KEY  — set ✅
API_TOKEN             — tp_9f4e2a7c1d8b3f6e0a5c9d2f7b4e1a8c ✅
REDIS_URL             — redis://red-d66d6m7gi27c738cuiv0:6379 ✅
OPENAI_API_KEY        — NOT SET ⚠️ (needed for synth_search.py semantic embeddings)
```

### Repo Contents
```
agents/prompts/       — 35 .md agent files (system prompts, context)
scripts/              — 11 Python scripts (mistake_logger, etc.)
pattern_library/      — 20 .json pattern files
app.py                — Flask entry point (real Claude API wiring)
requirements.txt      — flask, flask-cors, gunicorn, anthropic, supabase, redis, openai
DEPLOY_INSTRUCTIONS.md — Instructions for Mike's Claude Code to deploy real agentic loop
```

### CRITICAL PENDING: Mike's Real Flask API
The real agentic loop (with TSB cache, case search, pattern engine, confidence scoring) lives on Mike's machine at `F:/Mobil app/techpulse-api/`. It has NOT been pushed to GitHub yet.
Mike needs to:
1. Read `DEPLOY_INSTRUCTIONS.md` in the repo
2. Have Claude Code follow every step
3. Push the real Flask code — Render auto-deploys

---

## 6. Mobile App Architecture (Sidd's)

**Stack:** React Native + Expo
**Repo:** `sidd07181134/techpulse-app` (private)
**Connector API:** `https://techpulse-app.onrender.com`

### Key screens (mirrors web app flow)
- `CodesInputScreen.tsx` — Step 1: VIN + DTC codes
- `DiagnosticChatScreen.tsx` — Step 2: Chat with Synth
- `DiagnosticReportScreen.tsx` — Step 3: Report
- `DiagnosticFeedbackScreen.tsx` — Step 4: Confirm
- `BillingScreen.tsx` — Stripe billing (FULLY IMPLEMENTED on mobile)

### Billing endpoints used by mobile
```
GET  /billing/status              — Current subscription (planName, priceDisplay, status, currentPeriodEnd)
GET  /billing/plans               — Available plans [{id, name, price, priceId}]
POST /billing/checkout-session    — Create Stripe checkout session → returns URL
```
All calls go to `https://techpulse-app.onrender.com` with `getAuthHeaders(token)`.
Auth header: `Authorization: Bearer <user_token>`

### Shared data
- Both web and mobile use the same Supabase instance
- Subscriptions, payment history, and user records are shared
- The `useSynthSessionStore` Zustand store tracks session state

---

## 7. NEXT TASK: Stripe Billing on Web

**This is what was about to be built when this document was created.**

### What needs to be done
The web app has a billing page stub at `/app/billing` but it is NOT connected to Stripe.
The goal is to replicate the mobile `BillingScreen.tsx` exactly on web so both use the same backend.

### Architecture (web billing must match mobile exactly)
```
Web billing page
      ↓ GET /billing/plans
      ↓ GET /billing/status (with user auth token)
techpulse-app.onrender.com (Sidd's connector)
      ↓
Stripe API (server-side — web never touches Stripe key directly)
      ↓
Supabase (subscriptions table — shared with mobile)
```

### What the web billing page needs to do
1. **Load** — Fetch current subscription status + available plans
2. **Show plan** — Display current plan (name, price, renewal date, status)
3. **Subscribe** — POST to `/billing/checkout-session` with priceId → get Stripe URL → redirect to it
4. **Stripe redirects back** — Handle `?success=true` or `?canceled=true` return params
5. **Cancel** — Open Stripe customer portal (if that endpoint exists on Sidd's connector)
6. **Payment history** — Show past payments from Supabase

### What the new chat needs to find out from Sidd
The exact endpoint paths are confirmed from mobile source code:
- `API_ENDPOINTS.BILLING_STATUS`
- `API_ENDPOINTS.BILLING_PLANS`
- `API_ENDPOINTS.BILLING_CHECKOUT_SESSION`

**But the actual string values** (e.g. `/billing/status` vs `/api/billing/status`) need to be confirmed.
The new chat should read lines 62-81 of `techpulse-main/mobile/src/config/api.ts` to get the exact paths.

### Files to create/edit
- `src/app/app/billing/page.tsx` — Main billing page (replace stub)
- No new API routes needed — calls go directly to `techpulse-app.onrender.com`

---

## 8. Auth Flow

```
User clicks Sign in with Google
      ↓
techpulse-sync-api.onrender.com/api/auth/google
      ↓ Google OAuth
Redirects back to web app with ?token=&email=
      ↓
app-layout.tsx catches params → signIn(user, token) → stored in Zustand + localStorage
      ↓
All API calls use token as Authorization: Bearer header
```

---

## 9. Current Known Issues / Pending

| Issue | Status |
|-------|--------|
| Mike's real Flask agentic loop not deployed | ⚠️ Pending Mike action |
| OPENAI_API_KEY not set in Render (synth_search.py) | ⚠️ Needs key from Mike |
| Billing page not wired to Stripe | ⚠️ Next task |
| Diagnostic sessions not persisted to Supabase | ⚠️ TODO comment in useTickets hook |
| Dashboard shows empty state (no real ticket history yet) | Expected — awaiting Supabase |
| PDF paste-box flow removed in favor of native base64 | ✅ Fixed |
| Scrollbar missing in chat | ✅ Fixed (minHeight:0 chain) |
| Binary PDF leaking into symptoms field | ✅ Fixed |
| Build errors from header named export | ✅ Fixed |

---

## 10. Web App Commit History (April 2026)

Key commits on `ddoubleg123/techpulse-remotepc-automation`:
- Dashboard: replaced fake stats with real ticket history + empty state
- Sidebar: user card above Sign Out, white active state (no blue conflict)
- Header: removed D avatar, kept search + bell + theme toggle
- Chat: full 5-step diagnostic flow matching mobile
- Chat: VIN entry + file upload on Step 1
- Chat: PDF base64 to Claude native document blocks
- Chat: fixed binary leaking into symptoms
- Chat: clean user bubble (no raw initMsg displayed)
- Chat: scrollbar fix (minHeight:0 on flex chain)
- app-layout: height:100vh overflow:hidden
- app-layout: fixed named import for Header
- index.ts: fixed Header barrel export

---

## 11. How to Deploy Changes

### Web App or Auth API
```bash
# Changes auto-deploy via GitHub webhook to Render
# Just push to main branch — deploy starts in ~30 seconds, completes in 3-5 min
```

### Synth API (Mike's machine)
```bash
cd C:\Users\User\techpulse-api
git add .
git commit -m "describe change"
git push    # branch is master, not main
# Render auto-deploys in ~2 minutes
```

### Verify Synth API is live
```
GET https://techpulse-api.onrender.com/health
Expected: {"version":"2.1.0", "engine":"active", "pdf_support":true}
```

---

## 12. Contact / Access

| Person | Role | Access |
|--------|------|--------|
| Daniel Gouldman | Co-founder / CRO | GitHub `ddoubleg123`, all Render services |
| Mike Munson | Founder / CEO | Local machine at `C:/Users/User/techpulse-api/` |
| Sidd | Mobile developer | GitHub `sidd07181134`, `techpulse-app.onrender.com` |
| Candice Elsmore | Co-founder / COO-CFO | `candice@techpulse.dev` |

---

*Document auto-generated from development session — April 11, 2026*
*Repo: github.com/ddoubleg123/techpulse-remotepc-automation*
