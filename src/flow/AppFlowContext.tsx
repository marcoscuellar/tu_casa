import {
  createContext,
  useContext,
  useEffect,
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
  runPipeline,
  type PipelineResult,
} from '../engines/pipeline'
import type { GatedResearch } from '../engines/research'
import type { HiringInsight, RankedJob } from '../engines/types'

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
  setAccount: (name: string, email: string) => void

  /* Parsed profile (name from signup, role from the résumé) */
  candidateName: string
  candidateRole: string

  /* Ranked openings */
  jobs: RankedJob[]
  matchCount: number
  droppedCount: number
  duplicateCount: number
  /** True while the (possibly live) pipeline is still resolving. */
  loading: boolean

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

  // Run the pipeline once (async — live discovery fetches real boards).
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    runPipeline(PROVIDERS, { asOfYear: AS_OF_YEAR })
      .then((r) => alive && (setPipeline(r), setLoading(false)))
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
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

  const candidateRole = pipeline?.resume.titles[0]?.raw ?? 'your field'

  const value = useMemo<AppFlowContextValue>(
    () => ({
      name,
      email,
      setAccount: (n, e) => {
        setName(n)
        setEmail(e)
      },

      candidateName: name.trim() || 'there',
      candidateRole,

      jobs,
      matchCount: jobs.length,
      droppedCount: pipeline?.droppedCount ?? 0,
      duplicateCount: pipeline?.duplicateCount ?? 0,
      loading,

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
    [name, email, candidateRole, pipeline, jobs, loading, selectedJob, research, insight, credits, firstSheetUsed],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext)
  if (!ctx) throw new Error('useAppFlow must be used within AppFlowProvider')
  return ctx
}
