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
paywall gating **additional** cheat sheets once the free first one is used.

## Where real services plug in

The flow carries state through `src/flow/AppFlowContext.tsx`, and sample content
lives in `src/flow/data.ts`. In production, replace:

- **Upload/parse** (`Upload.tsx`) — the simulated ~2s parse with the real
  résumé parse/extract job; the parsed name/role feed every later screen.
- **Job search & ranking** (`data.ts` `MATCHES`) — from the parsed profile.
- **Fit scoring** (`FitCheck.tsx`, `data.ts`) — grade the pasted JD against the
  résumé.
- **Cheat-sheet generation** (`CheatGen.tsx`) — drive off the real
  company/role research + drafting job's completion.
- **Credits** (`AppFlowContext.tsx`) — first sheet free, then decrement a real
  credit balance; finding & fit are never gated.

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
