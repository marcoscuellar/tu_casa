# TuCasa

AI-powered job search — **free for job seekers**. Upload your résumé once, get a
ranked shortlist of genuine matches, check your fit against a specific role, and
generate a live interview cheat sheet. Finding jobs and checking fit are always
free; only additional interview cheat sheets use credits (the first is free).

Built from the design handoff in the black / red / white **bento** system, with a
calm, ADHD-friendly, one-clear-next-step-per-screen tone.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **React Router** for real routing (no prototype screen-switcher)
- Plain CSS with design tokens (`src/styles/tokens.css`) — no UI framework, so the
  bespoke bento visuals stay pixel-close to the handoff
- **Geist** / **Geist Mono** via Google Fonts

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Routes

| Route              | Screen                                                    |
| ------------------ | --------------------------------------------------------- |
| `/`                | Marketing landing page (+ ADHD support panel)             |
| `/signin`          | Sign in / sign up toggle, forgot password                 |
| `/onboarding`      | 3-step onboarding wizard                                  |
| `/account`         | Account & settings (change email, delete, edit identity)  |
| `/signup`          | App: create account (name + email)                        |
| `/upload`          | App: upload résumé (idle → parsing)                       |
| `/discovery`       | App: ranked shortlist                                      |
| `/fit`             | App: fit check (paste JD → result)                        |
| `/cheat-generating`| App: cheat-sheet generation loading state                 |
| `/cheatsheet`      | App: interview cheat sheet (section-jump nav)             |
| `/paywall`         | App: cheat-sheet credit packs                             |

Flow: `signup → upload → discovery → fit → cheat-generating → cheatsheet`, with the
paywall gating **additional** cheat sheets once the free first one is used. The
candidate provides only a résumé — no job description is ever asked for.

## The engine layer (`src/engines/`)

The résumé-in → jobs-out pipeline is implemented as deterministic, unit-tested
modules from the four specs. `npm test` runs 50 tests.

```
engines/
  types.ts        # all four specs' schemas
  synonymMap.ts   # deterministic skill normalization (MySQL ≠ SQL Server)
  scoring.ts      # rubric — layers 1–4, dealbreaker gate, verdicts (no LLM)
  discovery.ts    # Engine 4 — confidence mapping, liveness>freshness, never drop
  audit.ts        # Engine 3 — dedupe, flag-not-drop, only-confirmed-dead removed
  research.ts     # interview-research THIN/GO gate
  pipeline.ts     # discover → audit → score → rank
  providers/      # the LLM/web seams (fixtures now, live later)
```

**Determinism boundary:** scoring, discovery classification, audit, dedupe, and
the THIN/GO gate are pure and deterministic. The non-deterministic work — the
job crawl, live liveness re-check, résumé/company research, and the verdict
*prose* — sits behind `providers/`. Today those are fixtures; swapping in live
LLM/web implementations touches only that seam, never the engines or the UI.

## Specs

The engines are implementations of these documents — the docs are the source of
truth, `types.ts` mirrors them field for field.

| Doc | Covers |
|---|---|
| `resume_jd_scoring_rubric_FIXED.md` | Rubric — layers, dealbreakers, verdicts |
| `ENGINE_4_Job_Discovery_SEEKER_MODE.md` | Finding real, live postings |
| `ENGINE_3_Job_Audit_SEEKER_MODE.md` | Second-pass audit, dedupe, flag-not-drop |
| `interview_research_engine.md` | Company-level research + THIN/GO gate |
| `ENGINE_5_Interview_Prep_Cheat_Sheet.md` | The cheat sheet — intake, department scoping, the seven sections |
| `interview_prep_cheat_sheet_SAMPLE.md` | One cheat-sheet intake run end to end |

## Live job discovery (real ATS jobs)

Discovery can pull **real, live postings** from companies' public ATS boards —
no API key, no scraping, no paid feed. These are the same unauthenticated
endpoints a company's own careers page calls:

- Greenhouse — `boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
- Lever — `api.lever.co/v0/postings/{slug}?mode=json`
- Ashby — `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`

```
src/engines/live/
  ats/{greenhouse,lever,ashby}.ts   # fetch + normalize each board
  companies.seed.ts                 # ~40 seed companies (slugs)
  companySource.ts                  # CompanySourceProvider seam
  jdKeywordParser.ts                # posting text → ParsedJD (deterministic)
  filter.ts                         # résumé-driven relevance (family + location)
  liveDiscovery.ts                  # compose into a DiscoveryProvider
```

The **résumé drives the search** — the candidate's role family and location, never
a typed query. Pipeline order is unchanged: fetch → filter → Engine 4 → Engine 3
→ rubric → rank. Which companies to pull sits behind `CompanySourceProvider`
(seed list now; a "who's hiring for X in Y" reasoning step later).

**Turn it on:**

```bash
# In the app — real jobs instead of the fixture pipeline:
VITE_LIVE_JOBS=1 npm run dev

# From the CLI — pull the seed and print ranked real jobs:
npx vite-node scripts/run-live.ts
```

Live mode needs outbound access to the three ATS hosts. Where a proxy is in the
way (Node ≥ 22.21): `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=$CURL_CA_BUNDLE npx
vite-node scripts/run-live.ts`. Boards that fail (renamed slug, network) are
skipped, never fatal. Résumé parse + the cheat-sheet research/reasoning stay
fixtures this round; live JD parsing uses the deterministic keyword parser.

## Where real services plug in

The UI only ever touches `src/flow/AppFlowContext.tsx`, which runs the pipeline
on the fixture providers. To go live, implement the provider interfaces in
`src/engines/providers/types.ts`:

- **`ResumeProvider`** — parse an uploaded résumé into the rubric schema (LLM).
- **`DiscoveryProvider`** — find real, live postings (job crawl).
- **`AuditProvider`** — independent liveness re-check per posting.
- **`ResearchProvider`** — sourced, dated company research (LLM + web).
- **`NarrateProvider`** — the one LLM seam in scoring: the verdict write-up.
- **`JDParseProvider`** — parked capability for an optional "check a specific
  job" feature (JD paste), off the main résumé-in flow.

Credits (`AppFlowContext.tsx`) stay first-sheet-free then gated; finding & fit
are never gated.

## Structure

```
src/
  main.tsx, App.tsx          # entry + routes
  styles/tokens.css          # design tokens, resets, keyframes
  flow/
    AppFlowContext.tsx       # shared flow state + credit logic
    data.ts                  # sample matches / fit / cheat-sheet content
  lib/useClock.ts            # live date/time label
  components/
    AppShell.tsx             # top bar + page container (app flow)
    AdhdPanel.tsx            # shared "One thing for your head" support panel
    Toast.tsx                # transient confirmation toast
  pages/
    Landing.tsx              # marketing page
    app/                     # SignUp, Upload, Discovery, FitCheck,
                             #   CheatGen, CheatSheet, Paywall
    auth/                    # SignIn, Onboarding, Account
```

## Design notes

- Canonical palette (App Flow): paper `#EDEBE4`, ink `#0F0F0F`, red `#F01C0C`,
  field `#F4F2EC`. The marketing page keeps its own near-identical values
  (`#f4f1ea` / `#0a0a0a` / `#ff0000`) to match its capture exactly.
- The auth surfaces were reconciled from the handoff's earlier honey/navy
  iteration to the canonical black/red/white tokens.
- Animations: `tcPop` (screen entrance), `tcSpin` (spinners), `tcPulse`
  (in-progress dots), plus backdrop/modal pops for the slide-over.
