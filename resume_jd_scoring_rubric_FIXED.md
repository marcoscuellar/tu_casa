# Résumé ↔ JD Scoring Rubric

A deterministic scoring spec. Parse both sides into the same structure, score four weighted layers to 100, then apply the dealbreaker gate, then map to a verdict.

---

## Input schema (what you score on)

**Parsed résumé fields**
- `titles[]` → `{ raw, family, level }`
- `skills[]` → `{ canonical, years, last_used_year }` (normalized via synonym map)
- `years_total`
- `industries[]`
- `certs_clearances[]`
- `location`, `onsite_ok`

**Parsed JD fields**
- `title` → `{ family, level }`
- `hard_required_skills[]` → `{ canonical, min_years }`
- `preferred_skills[]`
- `min_years_total`
- `dealbreakers[]` → `{ type: cert|clearance|license|location, value, hard: true|false }`

---

## The 4 scored layers (100 pts total)

| Layer | Weight | What it measures |
|---|---|---|
| **1. Skills / tech overlap** | **45** | How many required skills are present (normalized) |
| **2. Seniority / years** | **25** | Do years clear the bar — overall + on key skill |
| **3. Title / role alignment** | **15** | Same job family & level, or a stretch |
| **4. Recency** | **15** | Are matched skills current or stale |

Then the **dealbreaker gate** caps the verdict — it is *not* additive.

---

## Layer 1 — Skills / tech (45 pts)

- **Hard-required (35 pts):** `35 × (hard_required_matched / hard_required_total)`
  - **Empty-category rule:** if `hard_required_total == 0`, award the full 35 (nothing required to miss). Never divide by zero.
- **Preferred (10 pts):** `10 × (preferred_matched / preferred_total)`, capped at 10
  - **Empty-category rule:** if `preferred_total == 0`, award the full 10. Never divide by zero.
- A skill "matches" only after passing through the **synonym map** (below). Never match raw strings.

## Layer 2 — Seniority / years (25 pts)

Graduated credit, applied twice:
- **Overall years (10 pts):** meets bar → 10 · within 1 yr → 6 · within 2 yrs → 3 · else 0
- **Key-skill years (15 pts):** same scale scaled to 15, measured on the single heaviest hard-required skill

## Layer 3 — Title / role alignment (15 pts)

- Same family **+** same level → **15**
- Same family, ±1 level (stretch up / over-qualified down) → **10**
- Adjacent family, transferable → **6**
- Different family → **0** (deterministic — no range; a different family scores zero here)
- `"BA" ≠ "Sr. BA" ≠ "BA Manager"` — level is not cosmetic.

## Layer 4 — Recency (15 pts)

Per matched hard-required skill, apply a decay on `last_used_year`, then average:

| Last used | Multiplier |
|---|---|
| ≤ 1 yr | 1.0 |
| > 1 to ≤ 3 yrs | 0.8 |
| > 3 to ≤ 5 yrs | 0.5 |
| > 5 to ≤ 8 yrs | 0.25 |
| > 8 yrs | 0.1 |

Buckets are half-open so every value lands in exactly one bucket (a skill last used exactly 1, 3, 5, or 8 years ago is deterministic).

`layer_score = 15 × avg(multipliers across matched hard-required skills)`

- **Empty-set rule:** if **zero** hard-required skills matched, there is nothing to average — set `layer_score = 0`. Never average an empty set.

---

## Dealbreaker gate (the honesty cap)

Applied **after** the 100-pt score. **The gate overrides the numeric verdict thresholds** — a gate result wins even if the raw score would map higher.
- **Hard dealbreaker failed** (missing required license, clearance, or onsite-location mismatch) → verdict **cannot exceed Partial**, and for a legal gate (RN license, security clearance) → force **No-go**, regardless of raw score. Always name the specific gap.
- **Soft dealbreaker failed** → allowed, but flagged in the write-up.

---

## Verdict thresholds

- **STRONG** → score ≥ **80** **AND** all hard-required skills present **AND** seniority bar met **AND** no dealbreaker failed
- **PARTIAL** → score **50–79**, **OR** ≥80 but with ≥1 named gap (missing required tool, years short, or a dealbreaker). *Always name the gap.*
- **WEAK** → score **< 50** (under ~half the required skills)
- **NO-GO** → forced by a failed **legal gate** (missing license/clearance), regardless of raw score. Overrides all numeric thresholds above. Always name the gap.

---

## Synonym map — the quietly hardest part

Structure it as `canonical → [aliases]`, all lowercased, punctuation/versions stripped, matched on word boundaries:

```
sql          ← t-sql, transact-sql        # generic SQL only
sql-server   ← mssql, sql server, pl/sql   # kept separate from generic sql and from mysql
react        ← react.js, reactjs
gcp          ← google cloud, google cloud platform
dynamics365  ← d365, ms dynamics, dynamics crm, dynamics 365
power bi     ← powerbi, pbi
k8s          ← kubernetes
```

Rules of thumb:
- Keep genuinely different products separate (MySQL ≠ SQL Server) even if they share a family flag.
- Strip version numbers before matching (`React 18` → `react`).
- **Seed + maintain:** pull a base taxonomy (O*NET / ESCO), have an LLM propose aliases, then human-review. This map is the difference between "feels smart" and "feels dumb."

---

## Build split (hybrid is the answer)

- **Rules / deterministic:** skills overlap, years, recency, dealbreakers — cheap, fast, explainable.
- **LLM:** the "how well does this experience actually transfer" judgment + the honest write-up — smarter on nuance, a few cents, less predictable.
- Let rules produce the score; let the LLM narrate the verdict and catch transfer nuance the rules miss.
