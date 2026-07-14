import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
import type { HiringInsight, ParsedResume, RankedJob, ResumeUpload } from '../engines/types'

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

export interface AppFlowContextValue {
  /* Account (from signup) */
  name: string
  email: string
  /** True once a (fake, in-memory) account exists — the cheat-sheet gate. */
  hasAccount: boolean
  setAccount: (name: string, email: string) => void

  /* Parsed profile (name from signup, role from the résumé) */
  candidateName: string
  candidateRole: string

  /* The confirmed résumé driving the search (skills etc.). */
  resume?: ParsedResume

  /* Ranked openings */
  jobs: RankedJob[]
  matchCount: number
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

export function AppFlowProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [firstSheetUsed, setFirstSheetUsed] = useState(false)

  // Two-step: parse the résumé into a draft profile, let the candidate confirm
  // it, then run discovery on the confirmed profile. Both steps return whether
  // they succeeded so the screens can navigate without racing the loading flag.
  const [draftResume, setDraftResume] = useState<ParsedResume | null>(null)
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null)
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

      candidateName: name.trim() || 'there',
      candidateRole,

      resume: pipeline?.resume,
      jobs,
      matchCount: jobs.length,
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
    [name, email, candidateRole, pipeline, jobs, loading, pipelineError, clearError, submitResume, draftResume, confirmResume, selectedJob, research, insight, credits, firstSheetUsed],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext)
  if (!ctx) throw new Error('useAppFlow must be used within AppFlowProvider')
  return ctx
}
