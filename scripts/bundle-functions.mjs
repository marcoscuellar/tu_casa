/**
 * Bundle the Vercel serverless functions into self-contained files.
 *
 * Why: Vercel does not bundle our shared TypeScript engine code (src/engines/…)
 * into the api/ functions — at runtime the cross-directory imports resolve to
 * files that aren't in the deployment ("Cannot find module '/var/task/src/…'").
 * So we bundle each function ourselves with esbuild: every import (engine code
 * AND the Anthropic SDK) is inlined into one file with no external ../src paths.
 *
 * Source of truth stays in src/engines/ (imported here, not duplicated).
 * Input:  functions-src/*.ts   Output: api/*.js  (what Vercel deploys)
 */
import { build } from 'esbuild'

await build({
  entryPoints: {
    'parse-resume': 'functions-src/parse-resume.ts',
    discover: 'functions-src/discover.ts',
  },
  outdir: 'api',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  logLevel: 'info',
})

console.log('✓ Bundled serverless functions → api/parse-resume.js, api/discover.js')
