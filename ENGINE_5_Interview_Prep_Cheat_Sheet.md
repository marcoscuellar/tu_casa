# ENGINE 5 (extension) — Interview Prep Cheat Sheet · SEEKER MODE

*The candidate-facing surface of the interview research engine. Where `interview_research_engine.md` decides what is true about a company, this decides what a nervous person can actually read thirty seconds before a call. Same no-fabrication discipline, re-aimed at glanceability.*

---

## ROLE

Turn a single intake — **who you're meeting, where, for what** — into a scoped, scannable brief the candidate keeps open in a second tab during the interview.

**Core mission:** not a company blurb. A *department-scoped* brief. The user is not interviewing with "Northwind" — they're interviewing with the person who runs Marketing at Northwind, and that person cares about different things than the CFO does.

**What it is not:** it does not write the candidate's answers. Those come from their résumé and are handled by the scoring rubric. This engine names what's true and what's likely to come up.

---

## THE ONE RULE THAT MATTERS MOST

Inherited unchanged from the research engine, because the failure mode is the same: **everything here can be said aloud, by a nervous person, to the exact people who'd know if it's wrong.**

- **Every fact carries a source and a date.** No source, no date → it doesn't render.
- **Never invent a stat, quote, product name, or person.** A fabricated number recited in the room is a disaster, not a rounding error.
- **Degrade gracefully.** A thin sheet is honest. A rich fake one is not.
- **Nothing ungrounded reaches the candidate.** Enforced in code, not by good intentions — see *Grounding* below.

---

## INTAKE

The sheet is **user-initiated and specific, never pre-written**. Four fields:

| Field | Required | Purpose |
|---|---|---|
| Who you're meeting — name | No | Personalizes §05; falls back to "your interviewer" |
| Their title | Yes\* | **Drives department derivation** — the whole scoping mechanism |
| Company | Yes | The research target |
| Role you're interviewing for | Yes\* | Fallback for department derivation; names the sheet |

\* *Title or role must be present* — at least one, so the research can be scoped. Company is always required.

Reached pre-filled from Fit Check ("Prep me"), or blank from the Cheat sheets nav.

**Gating:** the cheat sheet is the Pro-gated step. Intake → account → credits → generate. First sheet free.

---

## DEPARTMENT DERIVATION

The interviewer's title (falling back to the role) is matched against ordered keyword rules — **first match wins, specific before generic**:

| Department | Matches on |
|---|---|
| Marketing | marketing, brand, growth, demand, communicat·, content, social, PR |
| Sales | sales, revenue, account exec, AE, business development, BD, partnership, GTM |
| Product | product, PM, CPO |
| Design | design, UX, UI, user research |
| Data | data, analytic·, machine learning, ML, AI, scien·(ce/tist) |
| Engineering | engineer, develop, software, technical, architect, CTO, platform, infrastructure, devops, SRE, security |
| Finance | financ·, CFO, account(ing/ant), controller, FP&A, treasur· |
| People | people, talent, recruit, HR, human resources, CHRO |
| Operations | operations, COO, logistics, supply, program manage, bizops |
| Customer | customer, support, success, CS, account manage |
| Legal | legal, counsel, compliance, privacy |
| **the team** | *fallback — no rule matched* |

Ordering is load-bearing: "Head of Growth Engineering" resolves to **Marketing**, not Engineering, because growth is matched first. When nothing matches, the sheet says "the team" and stays useful — it just leans on role-based prep.

**Leadership detection** runs separately on the title (chief, C\*O, VP, vice president, head, director, lead, principal, founder, owner). It changes only §05: a leader gets probed-for-judgment framing; an IC gets day-to-day-craft framing.

---

## OUTPUT FORMAT

Seven numbered sections, side-nav addressable, scroll-spied. Every section is **bulleted** — no prose blocks anywhere, because this is read under stress.

### Intro
Department chip · "Prepping for {role} at {company}." · "Meeting **{name}** · {title}"

### 01 · Why {department} is hiring
Why *that team* is investing, and what moving the needle looks like in the first 90 days. Derived from the department's characteristic motion and metric.

### 02 · Recent {department} news
Dated, sourced signals scoped to the department. Each bullet renders its source and date as a trailing mono label. **A bullet with neither does not render one** — the absence is visible, not papered over.

### 03 · Org & leadership changes
Recent hires or re-orgs touching the department — new leaders bring new priorities — plus where the interviewer sits in the org.

### 04 · What they're launching
What the department is shipping next, and the instruction to have one story that maps to it.

### 05 · What {interviewer} cares about
Capped at **four** bullets. First is leadership-shaped or IC-shaped (see above); the rest are the department's characteristic concerns.

### 06 · Posture
Fixed, non-researched, identical on every sheet:

> You're not being judged — you're both figuring out if this fits. Slow down, answer the question they asked, and it's fine to take two seconds before you speak.

### 07 · Pre-flight
Fixed five-item checklist, tappable, state held for the session:

- Cheat sheet open in a second tab
- Water within reach
- Camera framed, light on your face
- Two wins ready to tell as stories
- Phone silenced — you're present

---

## LAYOUT — the sticky navigator

Two columns: a **264px sticky side rail** (`top: 14px`, always dark regardless of the reader's background choice) and the scrolling content panel.

The rail carries the eyebrow, the role, `{company} · {department}`, the seven numbered sections, the reader controls, and **+ New cheat sheet**. It stays put while the sheet scrolls, so the candidate can jump to a section mid-question without losing their place.

- **Scroll-spy.** An `IntersectionObserver` on the content panel tracks the topmost visible section and highlights it in the rail.
- **Jump lockout.** Clicking a section smooth-scrolls and pins the highlight for 800ms, so the sections scrolling past don't fight the click.
- **Mobile.** Below the breakpoint the grid collapses to one column and the rail goes `static` — it scrolls away rather than eating a phone screen.

---

## READER CONTROLS

The sheet is read by someone who may be anxious, rushed, or neurodivergent. **Defaults are neutral; the user chooses.** Both preferences persist to `localStorage`.

- **Background** — Calm (default) / Light / Dark. `tucasa:cheatTheme`
- **ADHD-friendly** — off by default. Calls out the first bullet of each list and opens up spacing. `tucasa:cheatAdhd`

Nothing is forced, and nothing about the choice is inferred from the user.

---

## GROUNDING (the honesty guardrail)

Where the sheet reasons — "why does this role exist?" — the reasoning is an LLM seam wrapped in two deterministic gates:

1. **Gate.** Reasoning only runs on **GO** research. THIN intelligence can't honestly infer a motive → returns null, and the sheet simply doesn't show that layer.
2. **Grounding.** Every derived talking point or likely question must cite at least one *real* signal or stated priority from the brief, and every cited source must exist. Ungrounded items are dropped. If grounding strips everything, the result is null.

A hallucinated "why" therefore cannot reach the candidate — not because the model was asked nicely, but because the path is closed.

---

## SAMPLE MODE

While the brief is deterministic fixture intel rather than live research, it carries `sample: true` and the sheet renders a visible banner:

> Sample intel — your live sheet pulls the real, current research for {company}.

Live Engine 5 is a clean swap: replace the brief builder's body with the provider call and set `sample: false`. The shape the UI consumes does not change.

---

## DATA SHAPE (handoff)

The cheat sheet consumes one object — `DepartmentBrief`:

| Field | Type | Feeds |
|---|---|---|
| `department` | string | Derived; scopes everything, drives the chip |
| `company` · `role` | string | Intro, nav |
| `interviewerName` · `interviewerTitle` | string | Intro, §05 |
| `whyHiring` | string[] | §01 |
| `recentNews` | `{text, source?, date?}[]` | §02 |
| `orgChanges` | string[] | §03 |
| `launches` | string[] | §04 |
| `interviewerCares` | string[] (max 4) | §05 |
| `sample` | boolean | Sample banner |

§06 and §07 are static and come from the app, not the brief.

---

## QA / HANDOFF CHECK

Before a sheet renders:

- Intake scoped (title **or** role present, company present): ✅ / ❌
- Department derived, or honestly "the team": ✅ / ❌
- Every §02 bullet either carries source + date, or visibly carries neither: ✅ / ❌
- §05 capped at 4 and shaped by leadership vs IC: ✅ / ❌
- Every reasoned claim grounded in a real signal: ✅ / ❌
- Sample banner shown iff `sample: true`: ✅ / ❌
- **READY:** GO / **THIN** (role prep only, no invented company facts)

**THIN is a valid outcome.** A company with almost no public footprint still gets a working sheet — it just leans on role-based prep and says so plainly. Better an honest thin sheet than a rich fake one.

---

## UPSTREAM

Fed by `interview_research_engine.md` (company-level truth) and the intake. Sits downstream of Fit Check, which hands over company and role pre-filled.
