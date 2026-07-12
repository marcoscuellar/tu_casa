/**
 * Fixture providers — stand-ins for the live seams.
 *
 * This is the sample data the old data.ts held, re-shaped into the specs'
 * schemas and run through the REAL deterministic engines. Scores here are
 * earned by the rubric, not hand-written. Swap these for live implementations
 * (résumé parse, job crawl + re-check, company research, LLM narration) without
 * touching the engines.
 */

import type { RawPosting } from '../discovery'
import type { RecheckSignal } from '../audit'
import type { ParsedJD, ParsedResume, ResearchBrief, ScoreResult } from '../types'
import type {
  AuditProvider,
  DiscoveryProvider,
  JDParseProvider,
  NarrateProvider,
  Providers,
  ResearchProvider,
  ResumeProvider,
} from './types'

/* ---------- Parsed résumé (Maya Chen) ---------- */

export const SAMPLE_RESUME: ParsedResume = {
  titles: [{ raw: 'Senior Frontend Engineer', family: 'frontend', level: 'senior' }],
  skills: [
    { canonical: 'react', years: 7, last_used_year: 2026 },
    { canonical: 'typescript', years: 6, last_used_year: 2026 },
    { canonical: 'javascript', years: 8, last_used_year: 2026 },
    { canonical: 'shopify-hydrogen', years: 3, last_used_year: 2026 },
    { canonical: 'design-systems', years: 7, last_used_year: 2026 },
    { canonical: 'nextjs', years: 4, last_used_year: 2026 },
    { canonical: 'node', years: 5, last_used_year: 2025 },
    { canonical: 'graphql', years: 1, last_used_year: 2023 },
  ],
  years_total: 8,
  industries: ['ecommerce', 'dtc'],
  certs_clearances: [],
  location: 'Remote',
  onsite_ok: true,
}

/* ---------- Raw postings (Engine 4 provider output) ---------- */

const jdNorthwind: ParsedJD = {
  title: { family: 'frontend', level: 'senior' },
  hard_required_skills: [
    { canonical: 'react', min_years: 5 },
    { canonical: 'typescript', min_years: 3 },
    { canonical: 'shopify-hydrogen', min_years: 2 },
  ],
  preferred_skills: ['design-systems', 'graphql'],
  min_years_total: 5,
  dealbreakers: [],
}

const jdLoomly: ParsedJD = {
  title: { family: 'frontend', level: 'lead' },
  hard_required_skills: [
    { canonical: 'react', min_years: 5 },
    { canonical: 'typescript', min_years: 4 },
    { canonical: 'node', min_years: 3 },
  ],
  preferred_skills: ['nextjs'],
  min_years_total: 6,
  dealbreakers: [],
}

const jdCedar: ParsedJD = {
  title: { family: 'frontend', level: 'lead' },
  hard_required_skills: [
    { canonical: 'react', min_years: 6 },
    { canonical: 'nextjs', min_years: 2 },
  ],
  preferred_skills: ['design-systems'],
  min_years_total: 7,
  dealbreakers: [],
}

const jdBrightline: ParsedJD = {
  title: { family: 'backend', level: 'senior' },
  hard_required_skills: [
    { canonical: 'typescript', min_years: 3 },
    { canonical: 'node', min_years: 3 },
    { canonical: 'k8s', min_years: 2 }, // Maya lacks this → named gap, PARTIAL
  ],
  preferred_skills: [],
  min_years_total: 5,
  dealbreakers: [],
}

export const SAMPLE_POSTINGS: RawPosting[] = [
  {
    id: 'northwind-sfe',
    company: 'Northwind Apparel',
    role: 'Senior Frontend Engineer',
    location: 'Remote (US)',
    remote: true,
    link: 'https://boards.greenhouse.io/northwind/jobs/sfe',
    postedDate: 'May 2026',
    salary: '$150–175k',
    sourceType: 'company-ats',
    livenessEvidence: 'confirmed-open',
    jd: jdNorthwind,
  },
  {
    // Duplicate of Northwind via an aggregator — Engine 3 collapses this.
    id: 'northwind-sfe-indeed',
    company: 'Northwind Apparel',
    role: 'Senior Frontend Engineer',
    location: 'Remote',
    remote: true,
    link: 'https://indeed.com/viewjob?jk=northwind-sfe',
    postedDate: 'May 2026',
    sourceType: 'aggregator-only',
    livenessEvidence: 'none',
    jd: jdNorthwind,
  },
  {
    id: 'loomly-staff',
    company: 'Loomly',
    role: 'Staff Web Engineer',
    location: 'Hybrid NYC',
    remote: false,
    link: 'https://jobs.lever.co/loomly/staff-web',
    postedDate: 'Mar 2026',
    salary: '$165–190k',
    sourceType: 'aggregator-corroborated',
    livenessEvidence: 'confirmed-open',
    jd: jdLoomly,
  },
  {
    id: 'cedar-lead',
    company: 'Cedar & Oak',
    role: 'Frontend Lead',
    location: 'Remote',
    remote: true,
    link: 'https://ziprecruiter.com/jobs/cedar-oak-frontend-lead',
    // An older but potentially still-open req — age must NOT downgrade it.
    postedDate: 'Nov 2025',
    salary: '$145–170k',
    sourceType: 'aggregator-only',
    livenessEvidence: 'none',
    jd: jdCedar,
  },
  {
    id: 'brightline-sse',
    company: 'Brightline',
    role: 'Senior Software Engineer',
    location: 'Remote',
    remote: true,
    link: 'https://boards.greenhouse.io/brightline/jobs/sse',
    postedDate: 'Apr 2026',
    salary: '$140–160k',
    sourceType: 'company-ats',
    livenessEvidence: 'confirmed-open',
    jd: jdBrightline,
  },
  {
    // Confirmed filled — Engine 3 drops this (the only removal path).
    id: 'willow-fe',
    company: 'Willow & Finch',
    role: 'Frontend Engineer',
    location: 'Remote',
    remote: true,
    link: 'https://boards.greenhouse.io/willow/jobs/fe',
    postedDate: 'Feb 2026',
    sourceType: 'company-ats',
    livenessEvidence: 'confirmed-closed',
    jd: jdNorthwind,
  },
]

/** Independent re-check signals (Engine 3 provider). */
export const SAMPLE_RECHECK: Record<string, RecheckSignal> = {
  'northwind-sfe': 'confirmed-live',
  'loomly-staff': 'confirmed-live',
  'cedar-lead': 'uncertain', // aggregator-only + couldn't confirm → FLAGGED
  'brightline-sse': 'confirmed-live',
  'willow-fe': 'confirmed-dead', // dropped
}

/* ---------- Research briefs (interview research provider) ---------- */

const RESEARCH: Record<string, ResearchBrief> = {
  'Northwind Apparel': {
    companyOneLiner:
      'Northwind Apparel is a mid-market DTC retailer moving from wholesale into direct e-commerce.',
    stageSize: 'Series C · ~450 people',
    mainProduct: 'A direct-to-consumer storefront, checkout, and a new mobile app.',
    signals: [
      {
        signal: 'New DTC mobile app launching this quarter',
        source: 'Northwind careers page',
        date: 'May 2026',
        youCouldSay:
          '“I saw the mobile app is launching this quarter — how is the web team splitting focus between it and the storefront?”',
      },
      {
        signal: 'Series C raised to fund the e-commerce replatform',
        source: 'TechCrunch',
        date: 'Jan 2026',
        youCouldSay:
          '“The Series C around the replatform stood out — that’s exactly the kind of migration I’ve led.”',
      },
    ],
    statedPriorities: [
      {
        priority: 'Performance and conversion on the storefront',
        howToUse:
          'Lead with your LCP and conversion wins — it’s what they openly say they care about.',
      },
    ],
    likelyThemes: [
      'Replatform / migration experience',
      'Working with a design-systems team',
      'Performance and Core Web Vitals',
    ],
    readiness: 'GO',
  },
}

const THIN_BRIEF = (company: string, role: string): ResearchBrief => ({
  companyOneLiner: `${company} is hiring for a ${role}. Public details were limited.`,
  signals: [],
  statedPriorities: [],
  likelyThemes: [
    'Core responsibilities of the role',
    'Your strongest, most relevant project',
    'How you ramp on an unfamiliar stack',
  ],
  readiness: 'THIN',
})

/* ---------- Parked JD-parse capability ---------- */

const CANNED_JD: ParsedJD = {
  title: { family: 'frontend', level: 'senior' },
  hard_required_skills: [
    { canonical: 'react', min_years: 4 },
    { canonical: 'typescript', min_years: 3 },
  ],
  preferred_skills: ['nextjs'],
  min_years_total: 4,
  dealbreakers: [],
}

/* ---------- The fixture provider bundle ---------- */

const resume: ResumeProvider = { parseResume: () => SAMPLE_RESUME }
const discovery: DiscoveryProvider = { findPostings: () => SAMPLE_POSTINGS }
const audit: AuditProvider = { recheck: () => SAMPLE_RECHECK }
const research: ResearchProvider = {
  research: (company, role) => RESEARCH[company] ?? THIN_BRIEF(company, role),
}
const narrate: NarrateProvider = {
  narrateVerdict: (score: ScoreResult, company: string) => {
    // Deterministic honest template standing in for the LLM write-up. The
    // specifics live in the covered/gaps columns, so this stays a summary line.
    const n = score.gaps.length
    const things = `${n} thing${n === 1 ? '' : 's'} to tighten`
    switch (score.verdict) {
      case 'STRONG':
        return `Strong match on the core work at ${company}. You clear the bar — go for it.`
      case 'PARTIAL':
        return `A real shot at ${company} — ${things} before you apply, noted on the right.`
      case 'WEAK':
        return `This one’s a stretch: the core requirements aren’t there yet.`
      default:
        return `Not a fit right now — a hard requirement isn’t met.`
    }
  },
}
const jd: JDParseProvider = { parseJobDescription: () => CANNED_JD }

export const fixtureProviders: Providers = {
  resume,
  discovery,
  audit,
  research,
  narrate,
  jd,
}
