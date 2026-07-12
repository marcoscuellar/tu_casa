/**
 * Live discovery CLI — pull REAL jobs from the seed companies' public ATS boards
 * and run the full pipeline against the sample résumé.
 *
 *   npx vite-node scripts/run-live.ts
 *
 * Needs open egress to boards-api.greenhouse.io, api.lever.co, api.ashbyhq.com.
 * In a proxied environment (Node >= 22.21):
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=$CURL_CA_BUNDLE npx vite-node scripts/run-live.ts
 */

import { runPipeline } from '../src/engines/pipeline'
import { createLiveProviders } from '../src/engines/providers/live'

const skips: string[] = []

const providers = createLiveProviders({
  onSkip: (c, reason) => skips.push(`${c.name} (${c.ats}:${c.slug}) — ${reason}`),
})

console.log('Fetching real ATS boards from the seed list…\n')
const result = await runPipeline(providers)

console.log(`\n=== ${result.jobs.length} ranked openings ===`)
for (const j of result.jobs.slice(0, 25)) {
  const flag = j.audit.recheck === 'flagged' ? ' ⚑verify' : ''
  console.log(
    `${String(j.fit.score).padStart(3)}  ${j.role} · ${j.company} · ${j.location}` +
      `${j.salary ? ' · ' + j.salary : ''}  [${j.fit.verdict}]${flag}`,
  )
  console.log(`     ${j.link}`)
}

console.log(
  `\ncollapsed duplicates: ${result.duplicateCount} · dropped (dead): ${result.droppedCount}`,
)
if (skips.length) {
  console.log(`\nskipped ${skips.length} board(s):`)
  for (const s of skips.slice(0, 50)) console.log('  - ' + s)
}
