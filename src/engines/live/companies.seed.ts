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
import type { IndustryTag } from '../industry'

export interface CompanyRef {
  name: string
  ats: AtsKind
  slug: string
  /** The company's domain — the authoritative industry signal for its jobs. */
  industry: IndustryTag
}

export const SEED_COMPANIES: CompanyRef[] = [
  // ---- Greenhouse ----
  { name: 'Stripe', ats: 'greenhouse', slug: 'stripe', industry: 'fintech' },
  { name: 'Airbnb', ats: 'greenhouse', slug: 'airbnb', industry: 'travel' },
  { name: 'GitLab', ats: 'greenhouse', slug: 'gitlab', industry: 'devtools' },
  { name: 'Figma', ats: 'greenhouse', slug: 'figma', industry: 'productivity' },
  { name: 'Databricks', ats: 'greenhouse', slug: 'databricks', industry: 'data-ai' },
  { name: 'Coinbase', ats: 'greenhouse', slug: 'coinbase', industry: 'crypto' },
  { name: 'Robinhood', ats: 'greenhouse', slug: 'robinhood', industry: 'fintech' },
  { name: 'Dropbox', ats: 'greenhouse', slug: 'dropbox', industry: 'productivity' },
  { name: 'Reddit', ats: 'greenhouse', slug: 'reddit', industry: 'social' },
  { name: 'Brex', ats: 'greenhouse', slug: 'brex', industry: 'fintech' },
  { name: 'Instacart', ats: 'greenhouse', slug: 'instacart', industry: 'ecommerce' },
  { name: 'DoorDash', ats: 'greenhouse', slug: 'doordash', industry: 'ecommerce' },
  { name: 'Pinterest', ats: 'greenhouse', slug: 'pinterest', industry: 'social' },
  { name: 'Cloudflare', ats: 'greenhouse', slug: 'cloudflare', industry: 'security' },
  { name: 'Samsara', ats: 'greenhouse', slug: 'samsara', industry: 'iot' },
  { name: 'Benchling', ats: 'greenhouse', slug: 'benchling', industry: 'healthtech' },
  { name: 'Gusto', ats: 'greenhouse', slug: 'gusto', industry: 'hr-tech' },
  { name: 'Airtable', ats: 'greenhouse', slug: 'airtable', industry: 'productivity' },

  // ---- Lever ----
  { name: 'Netflix', ats: 'lever', slug: 'netflix', industry: 'media' },
  { name: 'Plaid', ats: 'lever', slug: 'plaid', industry: 'fintech' },
  { name: 'Attentive', ats: 'lever', slug: 'attentive', industry: 'martech' },
  { name: 'KeepTruckin', ats: 'lever', slug: 'motive', industry: 'logistics' },
  { name: 'Sourcegraph', ats: 'lever', slug: 'sourcegraph', industry: 'devtools' },
  { name: 'Lattice', ats: 'lever', slug: 'lattice', industry: 'hr-tech' },
  { name: 'Ramp', ats: 'lever', slug: 'ramp', industry: 'fintech' },
  { name: 'Whatnot', ats: 'lever', slug: 'whatnot', industry: 'ecommerce' },
  { name: 'Fivetran', ats: 'lever', slug: 'fivetran', industry: 'data-ai' },
  { name: 'Included Health', ats: 'lever', slug: 'includedhealth', industry: 'healthtech' },

  // ---- Ashby ----
  { name: 'Linear', ats: 'ashby', slug: 'linear', industry: 'devtools' },
  { name: 'Vercel', ats: 'ashby', slug: 'vercel', industry: 'devtools' },
  { name: 'Replit', ats: 'ashby', slug: 'replit', industry: 'devtools' },
  { name: 'Mercury', ats: 'ashby', slug: 'mercury', industry: 'fintech' },
  { name: 'PostHog', ats: 'ashby', slug: 'posthog', industry: 'devtools' },
  { name: 'Hex', ats: 'ashby', slug: 'hex', industry: 'data-ai' },
  { name: 'Baseten', ats: 'ashby', slug: 'baseten', industry: 'data-ai' },
  { name: 'Watershed', ats: 'ashby', slug: 'watershed', industry: 'climate' },
  { name: 'Modal', ats: 'ashby', slug: 'modal', industry: 'data-ai' },
  { name: 'Clerk', ats: 'ashby', slug: 'clerk', industry: 'devtools' },
  { name: 'Resend', ats: 'ashby', slug: 'resend', industry: 'devtools' },
  { name: 'Cursor', ats: 'ashby', slug: 'anysphere', industry: 'devtools' },
]
