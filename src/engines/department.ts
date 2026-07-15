/**
 * Engine 5 (extension) — department-scoped interview intel.
 *
 * The cheat sheet is intake-driven: the user names WHO they're meeting, the
 * company, and the role. From the interviewer's title we derive the department
 * and scope the intel to it — why THAT team is hiring, its recent news, org
 * changes, launches, and what this specific person likely cares about.
 *
 * The content here is DETERMINISTIC, illustrative fixture intel (sample: true)
 * so the flow is fully clickable today. Live Engine 5 (real web + LLM research)
 * is a clean swap: replace `buildDepartmentBrief`'s body with the provider call
 * and set `sample: false`. The DepartmentBrief shape the UI consumes stays put.
 */

import type { DepartmentBrief, InterviewInput } from './types'

// Title/role keyword → canonical department. First match wins; order matters
// (more specific before generic).
const DEPT_RULES: [RegExp, string][] = [
  [/\b(marketing|brand|growth|demand|communicat|content|social|\bpr\b)/i, 'Marketing'],
  [/\b(sales|revenue|account exec|\bae\b|business development|\bbd\b|partnership|\bgtm\b)/i, 'Sales'],
  [/\b(product|\bpm\b|\bcpo\b)/i, 'Product'],
  [/\b(design|\bux\b|\bui\b|user research)/i, 'Design'],
  [/\b(data|analytic|machine learning|\bml\b|\bai\b|scien(ce|tist))/i, 'Data'],
  [/\b(engineer|develop|software|technical|architect|\bcto\b|platform|infrastructure|devops|\bsre\b|security)/i, 'Engineering'],
  [/\b(financ|\bcfo\b|account(ing|ant)|controller|fp&a|treasur)/i, 'Finance'],
  [/\b(people|talent|recruit|\bhr\b|human resources|\bchro\b)/i, 'People'],
  [/\b(operations|\bcoo\b|logistics|supply|program manage|bizops)/i, 'Operations'],
  [/\b(customer|support|success|\bcs\b|account manage)/i, 'Customer'],
  [/\b(legal|counsel|compliance|privacy)/i, 'Legal'],
]

/** Derive the department from the interviewer's title (falling back to the role). */
export function deriveDepartment(interviewerTitle: string, role: string): string {
  const hay = `${interviewerTitle} ${role}`
  for (const [re, dept] of DEPT_RULES) if (re.test(hay)) return dept
  return 'the team'
}

/** Is the title a leadership one? Shapes what the interviewer likely cares about. */
function isLeadership(title: string): boolean {
  return /\b(chief|\bc[a-z]o\b|vp|vice president|head|director|lead|principal|founder|owner)\b/i.test(
    title,
  )
}

// Per-department flavor for the illustrative fixture intel.
const DEPT_FLAVOR: Record<
  string,
  { motion: string; cares: string[]; launch: string; metric: string }
> = {
  Marketing: {
    motion: 'a new growth or repositioning push',
    cares: ['pipeline and brand impact, not activity', 'how you measure what works', 'clear storytelling'],
    launch: 'a rebrand or a new demand-gen motion',
    metric: 'pipeline, CAC, and brand lift',
  },
  Sales: {
    motion: 'a revenue-scaling or new-segment push',
    cares: ['quota history and how you got there', 'a repeatable process', 'how you handle a stalled deal'],
    launch: 'a new segment or pricing motion',
    metric: 'quota attainment and cycle time',
  },
  Product: {
    motion: 'a bet on a new product line or platform',
    cares: ['how you decide what NOT to build', 'evidence over opinion', 'shipping outcomes'],
    launch: 'a major release or platform bet',
    metric: 'adoption and retention',
  },
  Design: {
    motion: 'raising the craft bar or a redesign',
    cares: ['your process, not just the pixels', 'how you handle critique', 'accessibility'],
    launch: 'a redesign or a design-system rollout',
    metric: 'usability and consistency',
  },
  Data: {
    motion: 'standing up or scaling the data/ML function',
    cares: ['rigor and how you avoid fooling yourself', 'impact of your models', 'clean communication'],
    launch: 'a new data platform or ML feature',
    metric: 'model impact and data quality',
  },
  Engineering: {
    motion: 'a replatform or a reliability/scale push',
    cares: ['how you reason about trade-offs', 'ownership end to end', 'what you do when it breaks'],
    launch: 'a replatform or a reliability initiative',
    metric: 'reliability, velocity, and quality',
  },
  Finance: {
    motion: 'tighter planning or a fundraising cycle',
    cares: ['accuracy and judgment', 'how you partner with the business', 'clear narratives from numbers'],
    launch: 'a new planning cycle or systems move',
    metric: 'forecast accuracy and runway',
  },
  People: {
    motion: 'scaling hiring or leveling up the team',
    cares: ['how you raise the bar humanely', 'process that scales', 'reading a team'],
    launch: 'a hiring push or a new program',
    metric: 'time-to-hire and retention',
  },
  Operations: {
    motion: 'tightening execution across teams',
    cares: ['how you bring order to chaos', 'measurable process wins', 'cross-team trust'],
    launch: 'a new operating rhythm or tooling',
    metric: 'throughput and predictability',
  },
  Customer: {
    motion: 'a retention or expansion push',
    cares: ['how you turn a hard account around', 'signal over noise', 'proactive not reactive'],
    launch: 'a new success motion or tier',
    metric: 'retention and expansion',
  },
  Legal: {
    motion: 'building the function as the company scales',
    cares: ['pragmatism over blanket no', 'risk framed for the business', 'moving fast safely'],
    launch: 'a new policy or compliance program',
    metric: 'risk reduction and speed',
  },
  'the team': {
    motion: 'a growth or execution push',
    cares: ['concrete examples from your own work', 'how you think, not just what you did', 'ownership'],
    launch: 'a new initiative',
    metric: 'clear, measurable outcomes',
  },
}

/**
 * Build a department-scoped brief from the intake. Deterministic fixture intel
 * for now (sample: true) — plausible and structured, clearly illustrative until
 * live Engine 5 fills it in.
 */
export function buildDepartmentBrief(input: InterviewInput): DepartmentBrief {
  const department = deriveDepartment(input.interviewerTitle, input.role)
  const f = DEPT_FLAVOR[department] ?? DEPT_FLAVOR['the team']
  const co = input.company.trim() || 'the company'
  const who = input.interviewerName.trim() || 'your interviewer'
  const dept = department === 'the team' ? 'the team' : `${department}`

  const interviewerCares = [
    ...(isLeadership(input.interviewerTitle)
      ? [`As a leader, ${who} will probe for judgment and outcomes over task lists.`]
      : [`${who} will likely go deep on the day-to-day craft of the ${input.role.trim() || 'role'}.`]),
    ...f.cares.map((c) => `Be ready to speak to ${c}.`),
  ].slice(0, 4)

  return {
    department,
    company: input.company.trim(),
    role: input.role.trim(),
    interviewerName: input.interviewerName.trim(),
    interviewerTitle: input.interviewerTitle.trim(),
    whyHiring: [
      `${dept} at ${co} is investing — this opening most likely tracks ${f.motion}.`,
      `They'll want to see how you move ${f.metric} in the first 90 days.`,
    ],
    recentNews: [
      { text: `Watch for recent ${department} announcements from ${co} — bring one up to show you did the homework.`, source: 'live research', date: 'updated at generation' },
      { text: `Check ${co}'s newsroom and the team's LinkedIn for what shipped this quarter.`, source: 'live research' },
    ],
    orgChanges: [
      `Look for a recent ${department} leadership hire or re-org at ${co} — new leaders bring new priorities.`,
      `Know where ${who} sits in the org and who they report to.`,
    ],
    launches: [
      `${co} is likely working toward ${f.launch} — tie your experience to it.`,
      `Have one story ready that maps directly to what ${department} is shipping next.`,
    ],
    interviewerCares,
    sample: true,
  }
}
