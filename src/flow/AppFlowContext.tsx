import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Shared state for the job-seeker flow. In a real deployment these fields are
 * hydrated from services (résumé parse, job ranking, fit scoring, credit
 * balance). Here they carry the parsed profile + the current selection across
 * the routed screens, matching the handoff's State Management section.
 */
export interface Candidate {
  name: string
  role: string
}

export interface AppFlowState {
  /* Account (from signup) */
  name: string
  email: string
  /* Parsed profile */
  candidate: Candidate
  /* Fit check */
  jd: string
  fitJobTitle: string
  /* Cheat sheet target */
  cheatCompany: string
  cheatRole: string
  /* Credits — first cheat sheet is free, then credits gate additional ones */
  credits: number
  firstSheetUsed: boolean
}

export interface AppFlowContextValue extends AppFlowState {
  setAccount: (name: string, email: string) => void
  setFitTarget: (jobTitle: string, company: string, role: string) => void
  setJd: (jd: string) => void
  addCredits: (n: number) => void
  /** Consume one cheat-sheet generation. Returns whether it was allowed. */
  consumeSheet: () => boolean
  /** Whether generating a NEW sheet would hit the paywall. */
  needsCredits: () => boolean
}

const DEFAULT_CANDIDATE: Candidate = {
  name: 'Maya Chen',
  role: 'Senior Frontend Engineer',
}

const AppFlowContext = createContext<AppFlowContextValue | null>(null)

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppFlowState>({
    name: '',
    email: '',
    candidate: DEFAULT_CANDIDATE,
    jd: '',
    fitJobTitle: 'Senior Frontend Engineer · Northwind Apparel',
    cheatCompany: 'Northwind Apparel',
    cheatRole: 'Senior Frontend Engineer',
    credits: 0,
    firstSheetUsed: false,
  })

  const value = useMemo<AppFlowContextValue>(
    () => ({
      ...state,
      setAccount: (name, email) =>
        setState((s) => ({
          ...s,
          name,
          email,
          // In production the candidate profile comes from the parsed résumé.
          // We keep the sample profile but adopt the entered name.
          candidate: { ...s.candidate, name: name.trim() || s.candidate.name },
        })),
      setFitTarget: (fitJobTitle, cheatCompany, cheatRole) =>
        setState((s) => ({ ...s, fitJobTitle, cheatCompany, cheatRole })),
      setJd: (jd) => setState((s) => ({ ...s, jd })),
      addCredits: (n) => setState((s) => ({ ...s, credits: s.credits + n })),
      consumeSheet: () => {
        let allowed = false
        setState((s) => {
          if (!s.firstSheetUsed) {
            allowed = true
            return { ...s, firstSheetUsed: true }
          }
          if (s.credits > 0) {
            allowed = true
            return { ...s, credits: s.credits - 1 }
          }
          allowed = false
          return s
        })
        return allowed
      },
      needsCredits: () => state.firstSheetUsed && state.credits <= 0,
    }),
    [state],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext)
  if (!ctx) throw new Error('useAppFlow must be used within AppFlowProvider')
  return ctx
}
