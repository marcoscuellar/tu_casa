/**
 * Sample content for the prototype flow. In production these are replaced by
 * real service responses: job search/ranking from the parsed profile, fit
 * scoring against a pasted JD, and cheat-sheet generation with live research.
 */

export interface Match {
  score: number
  title: string
  company: string
  location: string
  salary: string
  tags: string[]
  top?: boolean
}

export const MATCHES: Match[] = [
  {
    score: 94,
    title: 'Senior Frontend Engineer',
    company: 'Northwind Apparel',
    location: 'Remote (US)',
    salary: '$150–175k',
    tags: ['Shopify Hydrogen', 'Design systems', '98% skills match'],
    top: true,
  },
  {
    score: 89,
    title: 'Staff Web Engineer',
    company: 'Loomly',
    location: 'Hybrid NYC',
    salary: '$165–190k',
    tags: ['React', 'Performance', 'Small team'],
  },
  {
    score: 82,
    title: 'Frontend Lead',
    company: 'Cedar & Oak',
    location: 'Remote',
    salary: '$145–170k',
    tags: ['Next.js', 'DTC', 'Mentoring'],
  },
  {
    score: 76,
    title: 'Senior Software Engineer',
    company: 'Brightline',
    location: 'Remote',
    salary: '$140–160k',
    tags: ['TypeScript', 'GraphQL'],
  },
]

export interface FitItem {
  t: string
  d: string
}

export const FIT_SCORE = 88
export const FIT_VERDICT_HEAD = 'Worth applying.'
export const FIT_VERDICT_BODY =
  'Strong match on the core work. Close two gaps in your cover note and you’re a top-tier candidate here — don’t overthink it.'

export const COVERED: FitItem[] = [
  {
    t: 'Shopify Hydrogen storefronts',
    d: 'You led the exact replatform they’re starting — twice.',
  },
  {
    t: 'Design-system fluency',
    d: 'Seven years pairing with design on shared component libraries.',
  },
  {
    t: 'Performance wins',
    d: 'Documented LCP and conversion improvements they’ll want to hear.',
  },
  {
    t: 'React + TypeScript depth',
    d: 'Comfortably above the bar for their core stack.',
  },
]

export const GAPS: FitItem[] = [
  {
    t: 'Native mobile at scale',
    d: 'They mention React Native for the new app; yours is a side project, not shipped at scale. Name it honestly.',
  },
  {
    t: 'Formal team leadership',
    d: 'They want someone who’s led 3+. You’ve led 1–2 — frame the mentoring you’ve done.',
  },
  {
    t: 'GraphQL federation',
    d: 'Listed as nice-to-have. A sentence on how fast you ramp covers it.',
  },
]

export interface NavItem {
  id: string
  num: string
  label: string
}

export const CHEAT_NAV: NavItem[] = [
  { id: 'company', num: '01', label: 'Company snapshot' },
  { id: 'talking', num: '02', label: 'Talking points' },
  { id: 'questions', num: '03', label: 'Likely questions' },
  { id: 'askback', num: '04', label: 'Questions to ask' },
  { id: 'posture', num: '05', label: 'Posture note' },
  { id: 'preflight', num: '06', label: 'Pre-flight checklist' },
]

export const PREFLIGHT: string[] = [
  'Cheat sheet open in a second tab',
  'Water within reach',
  'Camera framed, light on your face',
  'Two wins ready to tell as stories',
  'Phone silenced — you’re present',
]
