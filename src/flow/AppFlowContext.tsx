import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { track } from '../lib/analytics'
import { loadSession, saveSession } from '../lib/session'
import { fixtureProviders } from '../engines/providers/fixtures'
import { liveProviders } from '../engines/providers/live'
import {
  buildHiringInsight,
  buildResearch,
  narrateFit,
  runPipelineFromResume,
  type PipelineResult,
} from '../engines/pipeline'
import type { GatedResearch } from '../engines/research'
import { buildDepartmentBrief } from '../engines/department'
import type {
  DepartmentBrief,
  HiringInsight,
  InterviewInput,
  ParsedResume,
  RankedJob,
  ResumeUpload,
} from '../engines/types'

// Real ATS jobs when VITE_LIVE_JOBS=1 (needs open egress to the ATS hosts);
// otherwise the fixture pipeline, so the demo works offline and tests are hermetic.
const USE_LIVE = import.meta.env?.VITE_LIVE_JOBS === '1'
const PROVIDERS = USE_LIVE ? liveProviders : fixtureProviders

/**
 * Shared state for the résumé-in → jobs-out flow.
 *
 * The candidate provides only a résumé; the deterministic pipeline
 * (discover → audit → score → rank, in src/engines) produces the ranked list,
 * the per-job fit, and the cheat-sheet research. Providers are fixtures now and
 * live LLM/web later — the UI only ever touches this context, never the engines.
 */

/** Copy shown by the soft-signup modal when a gated action is attempted. */
export interface AccountGate {
  title: string
  sub?: string
}

export interface AppFlowContextValue {
  /* Account (from signup) */
  name: string
  email: string
  /** True once a (fake, in-memory) account exists — the cheat-sheet gate. */
  hasAccount: boolean
  setAccount: (name: string, email: string) => void

  /* Deferred / on-gate signup — the soft-signup modal + pending action. */
  /** Non-null while the soft-signup modal is open (its copy). */
  accountGate: AccountGate | null
  /**
   * Run `action` if the visitor already has an account; otherwise open the
   * soft-signup modal and run it once they finish. The action receives the
   * (freshly captured) email so save/apply flows can use it immediately.
   */
  requireAccount: (action: (email: string) => void, gate?: AccountGate) => void
  /** Complete the soft signup: set the account, then run the pending action. */
  submitAccountGate: (name: string, email: string) => void
  /** Dismiss the soft-signup modal without creating an account. */
  cancelAccountGate: () => void

  /* Parsed profile (name from signup, role from the résumé) */
  candidateName: string
  candidateRole: string

  /* The confirmed résumé driving the search (skills etc.). */
  resume?: ParsedResume

  /* Ranked openings */
  jobs: RankedJob[]
  /** The ranked tail beyond the focus cap — revealed on "show broader matches". */
  broaderJobs: RankedJob[]
  matchCount: number
  /** Postings reviewed before the focus cap (for "we reviewed N, ranked best M"). */
  rawCount: number
  /** The focus cap applied to `jobs` (default 50). */
  focusLimit: number
  droppedCount: number
  duplicateCount: number
  /** True while the (possibly live) pipeline is still resolving. */
  loading: boolean
  /** Whether real ATS jobs / real résumé parsing are active (VITE_LIVE_JOBS). */
  live: boolean
  /** A résumé-parse or pipeline error to surface on Upload, if any. */
  pipelineError?: string
  /** Clear any lingering error (e.g. when returning to the upload screen). */
  clearError: () => void
  /** Parse an uploaded résumé into a draft profile (does NOT search yet). True on success. */
  submitResume: (upload?: ResumeUpload) => Promise<boolean>
  /** The parsed-but-unconfirmed profile, shown on the "confirm your info" step. */
  draftResume?: ParsedResume
  /** Adopt a profile built elsewhere (e.g. the AI résumé builder) as the draft. */
  adoptResume: (resume: ParsedResume) => void
  /** Confirm the (possibly edited) profile and run discovery. True on success. */
  confirmResume: (resume: ParsedResume) => Promise<boolean>

  /* Selection carried into fit + cheat sheet */
  selectedJob?: RankedJob
  selectJob: (id: string) => void

  /* Cheat-sheet intake — who you're meeting, company, role (Engine 5 input). */
  interview?: InterviewInput
  setInterview: (input: InterviewInput) => void
  /** Department-scoped brief derived from the intake (fixtures now, live later). */
  departmentBrief?: DepartmentBrief

  /* Derived per selected job */
  cheatCompany: string
  cheatRole: string
  research?: GatedResearch
  /** Reasoned "why this role exists" + derived points/questions; null when thin. */
  insight?: HiringInsight | null
  narrate: (job: RankedJob) => string

  /* Credits — first cheat sheet free, then gated */
  credits: number
  addCredits: (n: number) => void
  consumeSheet: () => boolean
  needsCredits: () => boolean
}

const AppFlowContext = createContext<AppFlowContextValue | null>(null)

const AS_OF_YEAR = new Date().getFullYear()

/** Fallback copy when a caller opens the soft-signup gate without its own. */
const DEFAULT_GATE: AccountGate = {
  title: 'Create a quick profile',
  sub: 'Save your work and unlock more features. Takes 10 seconds.',
}

export function AppFlowProvider({ children }: { children: ReactNode }) {
  // Rehydrate an unsaved working shortlist from a previous tab, if one exists.
  const [restored] = useState(loadSession)
  const [name, setName] = useState(restored?.name ?? '')
  const [email, setEmail] = useState(restored?.email ?? '')
  const [interview, setInterviewState] = useState<InterviewInput | null>(
    restored?.interview ?? null,
  )
  const [accountGate, setAccountGate] = useState<AccountGate | null>(null)
  const pendingAction = useRef<((email: string) => void) | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(restored?.selectedId ?? null)
  const [credits, setCredits] = useState(0)
  const [firstSheetUsed, setFirstSheetUsed] = useState(false)

  // Two-step: parse the résumé into a draft profile, let the candidate confirm
  // it, then run discovery on the confirmed profile. Both steps return whether
  // they succeeded so the screens can navigate without racing the loading flag.
  const [draftResume, setDraftResume] = useState<ParsedResume | null>(null)
  const [pipeline, setPipeline] = useState<PipelineResult | null>(restored?.pipeline ?? null)
  const [loading, setLoading] = useState(false)
  const [pipelineError, setPipelineError] = useState<string | undefined>(undefined)

  // Step 1 — parse only (Claude in live mode, the sample in fixtures). The
  // result is a DRAFT the candidate reviews on the confirm step; we don't search
  // yet, and a missing field (e.g. no title) is filled in there, not fatal.
  const submitResume = useCallback(async (upload?: ResumeUpload): Promise<boolean> => {
    setLoading(true)
    setPipelineError(undefined)
    try {
      const resume = await PROVIDERS.resume.parseResume(upload)
      setDraftResume(resume)
      setLoading(false)
      return true
    } catch (e) {
      setLoading(false)
      setPipelineError(e instanceof Error ? e.message : 'Something went wrong.')
      return false
    }
  }, [])

  const clearError = useCallback(() => setPipelineError(undefined), [])

  // Deferred / on-gate signup: run the action now if signed in, else stash it,
  // open the soft-signup modal, and run it once the account is created.
  const requireAccount = useCallback(
    (action: (email: string) => void, gate?: AccountGate) => {
      if (email.trim().length > 0) {
        action(email.trim())
        return
      }
      pendingAction.current = action
      setAccountGate(gate ?? DEFAULT_GATE)
      track('account_gate_shown', { title: (gate ?? DEFAULT_GATE).title })
    },
    [email],
  )

  const submitAccountGate = useCallback((n: string, e: string) => {
    setName(n)
    setEmail(e)
    track('account_created')
    const act = pendingAction.current
    pendingAction.current = null
    setAccountGate(null)
    act?.(e.trim())
  }, [])

  const cancelAccountGate = useCallback(() => {
    pendingAction.current = null
    setAccountGate(null)
    track('account_gate_dismissed')
  }, [])

  // Persist the working shortlist (and any soft account) so closing the tab
  // before an explicit save doesn't lose it. Only writes once a search exists.
  useEffect(() => {
    if (pipeline) saveSession({ name, email, selectedId, interview, pipeline })
  }, [pipeline, name, email, selectedId, interview])

  // Step 2 — the candidate confirmed (and possibly edited) the profile; run
  // discovery → audit → score → rank on it.
  const confirmResume = useCallback(async (resume: ParsedResume): Promise<boolean> => {
    setDraftResume(resume)
    setLoading(true)
    setPipelineError(undefined)
    try {
      const result = await runPipelineFromResume(PROVIDERS, resume, { asOfYear: AS_OF_YEAR })
      setPipeline(result)
      setLoading(false)
      return true
    } catch (e) {
      setLoading(false)
      setPipelineError(e instanceof Error ? e.message : 'Something went wrong.')
      return false
    }
  }, [])

  const jobs = pipeline?.jobs ?? []
  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedId),
    [jobs, selectedId],
  )

  // Research is fetched + QA-gated per selected job.
  const research = useMemo<GatedResearch | undefined>(() => {
    if (!selectedJob) return undefined
    return buildResearch(PROVIDERS, selectedJob.company, selectedJob.role)
  }, [selectedJob])

  // "Why this role exists" — reasoned from verified signals, or null when thin.
  const insight = useMemo<HiringInsight | null>(() => {
    if (!selectedJob || !research) return null
    return buildHiringInsight(PROVIDERS, research, selectedJob.role)
  }, [selectedJob, research])

  // Department-scoped intel derived from the cheat-sheet intake. Deterministic
  // fixture intel today; live Engine 5 is a clean swap inside buildDepartmentBrief.
  const departmentBrief = useMemo<DepartmentBrief | undefined>(
    () => (interview ? buildDepartmentBrief(interview) : undefined),
    [interview],
  )

  const candidateRole =
    pipeline?.resume.titles[0]?.raw ?? draftResume?.titles[0]?.raw ?? 'your field'

  const value = useMemo<AppFlowContextValue>(
    () => ({
      name,
      email,
      hasAccount: email.trim().length > 0,
      setAccount: (n, e) => {
        setName(n)
        setEmail(e)
      },
      accountGate,
      requireAccount,
      submitAccountGate,
      cancelAccountGate,

      candidateName: name.trim() || 'there',
      candidateRole,

      resume: pipeline?.resume,
      jobs,
      broaderJobs: pipeline?.broaderJobs ?? [],
      matchCount: jobs.length,
      rawCount: pipeline?.rawCount ?? 0,
      focusLimit: pipeline?.focusLimit ?? 0,
      droppedCount: pipeline?.droppedCount ?? 0,
      duplicateCount: pipeline?.duplicateCount ?? 0,
      loading,
      live: USE_LIVE,
      pipelineError,
      clearError,
      submitResume,
      draftResume: draftResume ?? undefined,
      adoptResume: (resume) => setDraftResume(resume),
      confirmResume,

      selectedJob,
      selectJob: (id) => setSelectedId(id),

      interview: interview ?? undefined,
      setInterview: (input) => setInterviewState(input),
      departmentBrief,

      cheatCompany: selectedJob?.company ?? '',
      cheatRole: selectedJob?.role ?? '',
      research,
      insight,
      narrate: (job) => narrateFit(PROVIDERS, job.fit, job.company, job.role),

      credits,
      addCredits: (n) => setCredits((c) => c + n),
      consumeSheet: () => {
        if (!firstSheetUsed) {
          setFirstSheetUsed(true)
          return true
        }
        if (credits > 0) {
          setCredits((c) => c - 1)
          return true
        }
        return false
      },
      needsCredits: () => firstSheetUsed && credits <= 0,
    }),
    [name, email, accountGate, requireAccount, submitAccountGate, cancelAccountGate, candidateRole, pipeline, jobs, loading, pipelineError, clearError, submitResume, draftResume, confirmResume, selectedJob, interview, departmentBrief, research, insight, credits, firstSheetUsed],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext)
  if (!ctx) throw new Error('useAppFlow must be used within AppFlowProvider')
  return ctx
}
