/**
 * Seed company list — the boards we pull from in this first version.
 *
 * ATS feeds have no cross-company search (each board is fetched per company), so
 * discovery needs a company list. This hand-picked seed lets the whole pipeline
 * run on real jobs today. A smarter "which companies are hiring for this title
 * in this city" step plugs in later behind CompanySourceProvider — this list is
 * just the default implementation.
 *
 * NOTE: slugs are best-effort and were NOT verifiable from the build sandbox
 * (egress to the ATS hosts is blocked by policy). Wrong/renamed slugs simply
 * 404 and are skipped gracefully — edit freely; the pipeline tolerates it.
 */

import type { AtsKind } from './ats/types'

export interface CompanyRef {
  name: string
  ats: AtsKind
  slug: string
}

export const SEED_COMPANIES: CompanyRef[] = [
  // ---- Greenhouse ----
  { name: 'Stripe', ats: 'greenhouse', slug: 'stripe' },
  { name: 'Airbnb', ats: 'greenhouse', slug: 'airbnb' },
  { name: 'GitLab', ats: 'greenhouse', slug: 'gitlab' },
  { name: 'Figma', ats: 'greenhouse', slug: 'figma' },
  { name: 'Databricks', ats: 'greenhouse', slug: 'databricks' },
  { name: 'Coinbase', ats: 'greenhouse', slug: 'coinbase' },
  { name: 'Robinhood', ats: 'greenhouse', slug: 'robinhood' },
  { name: 'Dropbox', ats: 'greenhouse', slug: 'dropbox' },
  { name: 'Reddit', ats: 'greenhouse', slug: 'reddit' },
  { name: 'Brex', ats: 'greenhouse', slug: 'brex' },
  { name: 'Instacart', ats: 'greenhouse', slug: 'instacart' },
  { name: 'DoorDash', ats: 'greenhouse', slug: 'doordash' },
  { name: 'Pinterest', ats: 'greenhouse', slug: 'pinterest' },
  { name: 'Cloudflare', ats: 'greenhouse', slug: 'cloudflare' },
  { name: 'Samsara', ats: 'greenhouse', slug: 'samsara' },
  { name: 'Benchling', ats: 'greenhouse', slug: 'benchling' },
  { name: 'Gusto', ats: 'greenhouse', slug: 'gusto' },
  { name: 'Airtable', ats: 'greenhouse', slug: 'airtable' },

  // ---- Lever ----
  { name: 'Netflix', ats: 'lever', slug: 'netflix' },
  { name: 'Plaid', ats: 'lever', slug: 'plaid' },
  { name: 'Attentive', ats: 'lever', slug: 'attentive' },
  { name: 'KeepTruckin', ats: 'lever', slug: 'motive' },
  { name: 'Sourcegraph', ats: 'lever', slug: 'sourcegraph' },
  { name: 'Lattice', ats: 'lever', slug: 'lattice' },
  { name: 'Ramp', ats: 'lever', slug: 'ramp' },
  { name: 'Whatnot', ats: 'lever', slug: 'whatnot' },
  { name: 'Fivetran', ats: 'lever', slug: 'fivetran' },
  { name: 'Included Health', ats: 'lever', slug: 'includedhealth' },

  // ---- Ashby ----
  { name: 'Linear', ats: 'ashby', slug: 'linear' },
  { name: 'Vercel', ats: 'ashby', slug: 'vercel' },
  { name: 'Replit', ats: 'ashby', slug: 'replit' },
  { name: 'Mercury', ats: 'ashby', slug: 'mercury' },
  { name: 'PostHog', ats: 'ashby', slug: 'posthog' },
  { name: 'Hex', ats: 'ashby', slug: 'hex' },
  { name: 'Baseten', ats: 'ashby', slug: 'baseten' },
  { name: 'Watershed', ats: 'ashby', slug: 'watershed' },
  { name: 'Modal', ats: 'ashby', slug: 'modal' },
  { name: 'Clerk', ats: 'ashby', slug: 'clerk' },
  { name: 'Resend', ats: 'ashby', slug: 'resend' },
  { name: 'Cursor', ats: 'ashby', slug: 'anysphere' },
]
