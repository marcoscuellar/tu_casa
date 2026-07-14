import { describe, expect, it } from 'vitest'
import { parseAiBuild, validateDraft } from './aiResumeBuilder'
import { draftToParsedResume, draftToResumeDoc } from '../../lib/aiResume'

describe('parseAiBuild', () => {
  it('extracts reply + draft from clean JSON', () => {
    const out = parseAiBuild(
      '{"reply":"What did a normal day look like?","resume":{"name":"Dana Reyes","headline":"Front Office Coordinator","years_total":3,"experience":[{"title":"Dental Front Desk","years":3,"bullet":"Ran intake and billing."}],"industries":["Healthcare"],"skills":["Scheduling","Billing"]}}',
    )
    expect(out.reply).toContain('normal day')
    expect(out.draft.name).toBe('Dana Reyes')
    expect(out.draft.experience[0].bullet).toBe('Ran intake and billing.')
    expect(out.draft.skills).toEqual(['Scheduling', 'Billing'])
  })

  it('tolerates surrounding prose and falls back on bad JSON', () => {
    const out = parseAiBuild('Sure! {"reply":"Hi","resume":{"skills":["React"]}} — hope that helps')
    expect(out.reply).toBe('Hi')
    expect(out.draft.skills).toEqual(['React'])
    const bad = parseAiBuild('not json at all')
    expect(bad.reply.length).toBeGreaterThan(0)
    expect(bad.draft.skills).toEqual([])
  })
})

describe('validateDraft', () => {
  it('coerces + dedupes + clamps', () => {
    const d = validateDraft({
      name: 42,
      years_total: 999,
      skills: ['React', 'react', 'TypeScript'],
      industries: 'nope',
      experience: [{ title: 'X', years: '4', bullet: 'did things' }, {}],
    })
    expect(d.name).toBe('')
    expect(d.years_total).toBe(60)
    expect(d.skills).toEqual(['React', 'TypeScript'])
    expect(d.industries).toEqual([])
    expect(d.experience).toHaveLength(1)
    expect(d.experience[0].years).toBe(4)
  })
})

describe('draft → ParsedResume / ResumeDoc', () => {
  const draft = validateDraft({
    name: 'Dana Reyes',
    headline: 'Front Office Coordinator',
    years_total: 3,
    experience: [{ title: 'Dental Front Desk', years: 3, bullet: 'Ran intake.' }],
    industries: ['Healthcare'],
    skills: ['Scheduling', 'Billing'],
  })

  it('rejoins the pipeline as a ParsedResume', () => {
    const pr = draftToParsedResume(draft)
    expect(pr.titles[0].raw).toBe('Front Office Coordinator')
    expect(pr.titles[0].family).toBeTruthy()
    expect(pr.years_total).toBe(3)
    expect(pr.industries).toEqual(['Healthcare'])
    expect(pr.skills.length).toBe(2)
    expect(pr.skills[0].last_used_year).toBeGreaterThan(2000)
  })

  it('falls back to summed years when no total is given', () => {
    const noTotal = validateDraft({
      headline: 'X',
      experience: [{ title: 'A', years: 2, bullet: 'b' }, { title: 'B', years: 1, bullet: 'c' }],
    })
    expect(draftToParsedResume(noTotal).years_total).toBe(3)
  })

  it('converts to an editable ResumeDoc for download', () => {
    const doc = draftToResumeDoc(draft)
    expect(doc.name).toBe('Dana Reyes')
    expect(doc.experience[0].title).toBe('Dental Front Desk')
    expect(doc.experience[0].bullets[0]).toBe('Ran intake.')
    expect(doc.skills).toContain('Billing')
  })
})
