/**
 * Static UI structure for the cheat sheet. The section *content* now comes from
 * the interview-research brief (via AppFlowContext); these are just the fixed
 * nav labels and the pre-flight checklist, which aren't research-derived.
 */

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
