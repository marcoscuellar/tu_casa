import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './Paywall.css'

/**
 * Flat-Pro upsell (reskin Phase 4.1). Finding + fit + one AI résumé tailor stay
 * free; unlimited tailoring and interview cheat sheets are Pro ($15/mo). No real
 * billing yet — "Go Pro" grants an ample balance so the cheat-sheet flow keeps
 * working, standing in for a real subscription until Stripe is wired.
 */
export function Paywall() {
  const navigate = useNavigate()
  const { cheatCompany, cheatRole, addCredits, consumeSheet } = useAppFlow()

  const goPro = () => {
    addCredits(999)
    consumeSheet()
    navigate('/cheat-generating')
  }

  return (
    <AppShell>
      <div className="paywall-grid pop grid-collapse">
        {/* Left */}
        <div className="blk blk-black paywall-left">
          <div className="eyebrow">Finding &amp; fit stay free</div>
          <div>
            <h1 className="head paywall-head">
              Nailed the
              <br />
              first one?
              <br />
              <span className="red">Go Pro.</span>
            </h1>
            <p className="paywall-body">
              Finding jobs, checking your fit, and one AI résumé tailor stay
              free — forever. Pro unlocks the heavy AI lifts: unlimited résumé
              tailoring and a live interview cheat sheet for every room.
            </p>
          </div>
          <div className="paywall-ready mono-label">
            Ready for: {cheatCompany} · {cheatRole}
          </div>
        </div>

        {/* Right — single Pro plan */}
        <div className="blk blk-white paywall-right">
          <div className="paywall-pro">
            <span className="paywall-pro-tag mono-label">Most seekers</span>
            <div className="paywall-pro-name">Pro</div>
            <div className="paywall-pro-price">
              $15<span className="paywall-pro-per">/mo · cancel anytime</span>
            </div>
            <ul className="paywall-pro-feats">
              <li>Unlimited AI résumé tailoring — re-done for each role</li>
              <li>
                Interview cheat sheets for every interview — company intel,
                likely questions, ready answers
              </li>
              <li>Up to 20 cheat sheets a month</li>
            </ul>
            <button className="paywall-buy" onClick={goPro}>
              Go Pro →
            </button>
            <button className="paywall-later" onClick={() => navigate('/discovery')}>
              Maybe later — keep looking
            </button>
            <p className="paywall-foot">
              Job hunts end. Cancel the moment you land the offer. Finding &amp;
              fit always free.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
