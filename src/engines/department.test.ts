import { describe, expect, it } from 'vitest'
import { buildDepartmentBrief, deriveDepartment } from './department'
import type { InterviewInput } from './types'

describe('deriveDepartment', () => {
  it('maps the interviewer title to a department', () => {
    expect(deriveDepartment('VP of Marketing', 'Content Strategist')).toBe('Marketing')
    expect(deriveDepartment('Head of Sales', 'Account Executive')).toBe('Sales')
    expect(deriveDepartment('Sr. Software Engineer', 'Frontend Engineer')).toBe('Engineering')
    expect(deriveDepartment('Chief Financial Officer', 'Analyst')).toBe('Finance')
    expect(deriveDepartment('Director of Product', 'Product Manager')).toBe('Product')
    expect(deriveDepartment('Recruiter', 'Anything')).toBe('People')
  })

  it('falls back to the role when the title is unhelpful', () => {
    // Title has no department signal, but the role does.
    expect(deriveDepartment('Interviewer', 'Growth Marketing Lead')).toBe('Marketing')
  })

  it('falls back to "the team" when nothing matches', () => {
    expect(deriveDepartment('Person', 'Generalist')).toBe('the team')
  })
})

describe('buildDepartmentBrief', () => {
  const input: InterviewInput = {
    interviewerName: 'Dana Lee',
    interviewerTitle: 'VP of Marketing',
    company: 'Northwind',
    role: 'Content Strategist',
  }

  it('scopes the brief to the derived department and fills every bucket', () => {
    const b = buildDepartmentBrief(input)
    expect(b.department).toBe('Marketing')
    expect(b.company).toBe('Northwind')
    expect(b.interviewerName).toBe('Dana Lee')
    expect(b.whyHiring.length).toBeGreaterThan(0)
    expect(b.recentNews.length).toBeGreaterThan(0)
    expect(b.orgChanges.length).toBeGreaterThan(0)
    expect(b.launches.length).toBeGreaterThan(0)
    expect(b.interviewerCares.length).toBeGreaterThan(0)
    expect(b.sample).toBe(true)
  })

  it('weaves the company + interviewer into the intel', () => {
    const b = buildDepartmentBrief(input)
    expect(b.whyHiring.join(' ')).toContain('Northwind')
    expect(b.orgChanges.join(' ')).toContain('Dana Lee')
  })

  it('reads a leadership title differently from an IC title', () => {
    const lead = buildDepartmentBrief(input)
    const ic = buildDepartmentBrief({ ...input, interviewerName: 'Sam Ito', interviewerTitle: 'Marketing Coordinator' })
    expect(lead.interviewerCares[0]).toMatch(/leader/i)
    expect(ic.interviewerCares[0]).toMatch(/day-to-day/i)
  })
})
