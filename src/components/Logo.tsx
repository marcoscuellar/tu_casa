import { Link } from 'react-router-dom'

/** TuCasa wordmark (concept 6c): two bento blocks — "TU" on accent, "CASA" on ink. */
export function Logo({ to = '/', size = 14 }: { to?: string | null; size?: number }) {
  const block = {
    fontWeight: 900,
    fontSize: size,
    letterSpacing: '-0.02em',
    padding: `${Math.round(size * 0.3)}px ${Math.round(size * 0.55)}px`,
    lineHeight: 1,
    color: '#fff',
  } as const

  const lockup = (
    <span style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: Math.round(size * 0.5), overflow: 'hidden', fontFamily: 'var(--font)' }}>
      <span style={{ ...block, background: 'var(--accent)' }}>TU</span>
      <span style={{ ...block, background: 'var(--ink)' }}>CASA</span>
    </span>
  )

  if (!to) return lockup
  return (
    <Link to={to} aria-label="TuCasa — home" style={{ display: 'inline-flex', textDecoration: 'none' }}>
      {lockup}
    </Link>
  )
}
