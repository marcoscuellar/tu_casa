import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { fixtureProviders } from '../engines/providers/fixtures'
import {
  buildResearch,
  narrateFit,
  runPipeline,
  type PipelineResult,
} from '../engines/pipeline'
import type { GatedResearch } from '../engines/research'
import type { RankedJob } from '../engines/types'

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

  /* Selection carried into fit + cheat sheet */
  selectedJob?: RankedJob
  selectJob: (id: string) => void

  /* Derived per selected job */
  cheatCompany: string
  cheatRole: string
  research?: GatedResearch
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

  // Run the deterministic pipeline once on the fixture résumé.
  const pipeline: PipelineResult = useMemo(
    () => runPipeline(fixtureProviders, { asOfYear: AS_OF_YEAR }),
    [],
  )

  const selectedJob = useMemo(
    () => pipeline.jobs.find((j) => j.id === selectedId),
    [pipeline.jobs, selectedId],
  )

  // Research is fetched + QA-gated per selected job.
  const research = useMemo<GatedResearch | undefined>(() => {
    if (!selectedJob) return undefined
    return buildResearch(fixtureProviders, selectedJob.company, selectedJob.role)
  }, [selectedJob])

  const candidateRole = pipeline.resume.titles[0]?.raw ?? 'your field'

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

      jobs: pipeline.jobs,
      matchCount: pipeline.jobs.length,
      droppedCount: pipeline.droppedCount,
      duplicateCount: pipeline.duplicateCount,

      selectedJob,
      selectJob: (id) => setSelectedId(id),

      cheatCompany: selectedJob?.company ?? '',
      cheatRole: selectedJob?.role ?? '',
      research,
      narrate: (job) =>
        narrateFit(fixtureProviders, job.fit, job.company, job.role),

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
    [name, email, candidateRole, pipeline, selectedJob, research, credits, firstSheetUsed],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}

export function useAppFlow(): AppFlowContextValue {
  const ctx = useContext(AppFlowContext)
  if (!ctx) throw new Error('useAppFlow must be used within AppFlowProvider')
  return ctx
}
