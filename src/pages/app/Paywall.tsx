import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './Paywall.css'

interface Pack {
  id: string
  count: number
  name: string
  price: string
  best?: boolean
}

const PACKS: Pack[] = [
  { id: 'starter', count: 3, name: 'Starter', price: '$9' },
  { id: 'season', count: 10, name: 'Season', price: '$22', best: true },
]

export function Paywall() {
  const navigate = useNavigate()
  const { cheatCompany, cheatRole, addCredits, consumeSheet } = useAppFlow()
  const [selected, setSelected] = useState('season')

  const buy = () => {
    const pack = PACKS.find((p) => p.id === selected) ?? PACKS[1]
    // In production: process the purchase, then credit the balance.
    addCredits(pack.count)
    // Immediately spend one on the sheet they came here to build.
    consumeSheet()
    navigate('/cheat-generating')
  }

  return (
    <AppShell>
      <div className="paywall-grid pop grid-collapse">
        {/* Left */}
        <div className="blk blk-black paywall-left">
          <div className="eyebrow">The first one was on us</div>
          <div>
            <h1 className="head paywall-head">
              Nailed the
              <br />
              first one?
              <br />
              <span className="red">Keep going.</span>
            </h1>
            <p className="paywall-body">
              Finding jobs and checking your fit stay free, forever. Interview
              cheat sheets run on credits — because each one is fresh, live
              research built for one specific room. We hope you won&rsquo;t need
              many.
            </p>
          </div>
          <div className="paywall-ready mono-label">
            Ready for: {cheatCompany} · {cheatRole}
          </div>
        </div>

        {/* Right */}
        <div className="blk blk-white paywall-right">
          <div className="paywall-credits-label mono-label">
            Cheat sheet credits
          </div>
          <div className="paywall-packs">
            {PACKS.map((p) => (
              <button
                key={p.id}
                className={`paywall-pack ${p.best ? 'is-best' : ''} ${
                  selected === p.id ? 'is-selected' : ''
                }`}
                onClick={() => setSelected(p.id)}
                aria-pressed={selected === p.id}
              >
                {p.best && <span className="paywall-ribbon">Best value</span>}
                <div className={`paywall-pack-num ${p.best ? 'red' : ''}`}>
                  {p.count}
                </div>
                <div className="paywall-pack-mid">
                  <div className="paywall-pack-name">{p.name}</div>
                  <div className="paywall-pack-sub">{p.count} cheat sheets</div>
                </div>
                <div className="paywall-pack-price">{p.price}</div>
              </button>
            ))}
          </div>
          <button className="btn btn-red-to-black paywall-buy" onClick={buy}>
            Get credits &amp; build it
          </button>
          <button className="paywall-later" onClick={() => navigate('/discovery')}>
            Maybe later — keep looking
          </button>
          <p className="paywall-foot">
            No subscription. Credits don&rsquo;t expire. Finding &amp; fit always
            free.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
