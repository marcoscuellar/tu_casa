import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import type { ResumeUpload } from '../../engines/types'
import './flow.css'
import './Upload.css'

// A tiny sample résumé so live mode can be tried without a file on hand.
const SAMPLE_RESUME_TEXT = `Maya Chen — Senior Frontend Engineer
Remote (US) · open to occasional onsite

EXPERIENCE
Loomly — Senior Frontend Engineer (2019–present, 7 yrs)
- Led a Shopify Hydrogen storefront replatform (React, TypeScript). LCP 4.1s → 1.6s, +12% mobile conversion.
- Built and owned a shared design-systems component library used across teams.
- Shipped Next.js marketing surfaces; some Node.js/GraphQL API work.
Cedar & Oak — Frontend Engineer (2016–2019, 3 yrs)
- React + JavaScript e-commerce work.

SKILLS: React (7 yrs), TypeScript (6 yrs), JavaScript (9 yrs), Shopify Hydrogen (3 yrs),
Design systems (7 yrs), Next.js (4 yrs), Node.js (5 yrs), GraphQL (1 yr)

8 years total experience. Industries: e-commerce, DTC.`

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '') // strip the data: prefix
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

export function Upload() {
  const navigate = useNavigate()
  const { live, submitResume, pipelineError, clearError } = useAppFlow()
  const [parsing, setParsing] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Returning to upload starts fresh — drop any stale error from a prior attempt.
  useEffect(() => clearError(), [clearError])

  // Parse the résumé (Claude in live mode, the sample in fixtures), then go to
  // the confirm step where the candidate reviews what we read before we search.
  const start = async (upload?: ResumeUpload) => {
    if (parsing) return
    setParsing(true)
    const ok = await submitResume(upload)
    if (ok) navigate('/confirm')
    else setParsing(false) // pipelineError is shown below
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!live) return start() // fixtures ignore the file and use the sample
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await readFileAsBase64(file)
        await start({ kind: 'pdf', base64, filename: file.name })
      } else {
        const text = await file.text()
        await start({ kind: 'text', text, filename: file.name })
      }
    } catch {
      setParsing(false)
    }
  }

  const onSample = () => {
    if (!live) return start()
    void start({ kind: 'text', text: SAMPLE_RESUME_TEXT })
  }

  return (
    <AppShell>
      <div className="upload-bento pop">
        <div className="blk blk-black upload-block">
        <div className="upload-header">
          <div className="eyebrow">Step 01 / In</div>
          <div className="upload-step mono-label">Setup · 1 of 2</div>
        </div>

        <div className="upload-intro">
          <h1 className="head upload-head">
            Drop your <span className="red">résumé.</span>
          </h1>
          <p className="upload-sub">
            It&rsquo;s the only thing we&rsquo;ll ask you to bring. Your name,
            role, and experience all come from here — you&rsquo;ll never re-type
            them. Private to you.
          </p>
        </div>

        <div className="upload-foot">
          {!parsing ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.doc,.txt,text/plain,application/pdf"
                hidden
                onChange={onFile}
              />
              <button className="upload-dropzone" onClick={() => fileInput.current?.click()}>
                <span className="upload-plus">+</span>
                <span>
                  <span className="upload-dz-title">
                    Drop your résumé here, or click to upload
                  </span>
                  <span className="upload-dz-sub">
                    PDF, DOCX, or plain text · up to 10MB
                  </span>
                </span>
                <span className="upload-browse mono-label">Browse →</span>
              </button>
              <p className="upload-sample">
                No résumé handy?{' '}
                <a
                  className="upload-sample-link"
                  onClick={onSample}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSample()}
                >
                  Use a sample to look around →
                </a>
              </p>
              <p className="upload-sample">
                Don&rsquo;t have a résumé yet?{' '}
                <a
                  className="upload-sample-link"
                  onClick={() => navigate('/builder')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/builder')}
                >
                  Build one in a minute →
                </a>
              </p>
              {pipelineError && <p className="upload-error">{pipelineError}</p>}
            </>
          ) : (
            <div className="upload-parsing">
              <div className="upload-spinner" />
              <div className="upload-parsing-copy">
                <div className="upload-parsing-title">Reading your résumé…</div>
                <p className="upload-parsing-sub">
                  Pulling out your experience so we can find roles that actually
                  fit. A few seconds.
                </p>
              </div>
              <div className="upload-checklist">
                <div className="upload-check">
                  <span className="upload-tick">✓</span> Contact &amp; name
                </div>
                <div className="upload-check">
                  <span className="upload-tick">✓</span> Roles &amp; titles
                </div>
                <div className="upload-check upload-check-pending">
                  <span className="upload-ring" /> Skills &amp; experience
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="upload-steps-box">
          <div className="upload-steps-title mono-label">What happens next</div>
          <ol className="upload-steps">
            <li className="upload-step-item is-now">
              <span className="upload-step-n mono-label">01</span>
              <div>
                <div className="upload-step-title">Drop your résumé</div>
                <div className="upload-step-desc">You&rsquo;re here.</div>
              </div>
            </li>
            <li className="upload-step-item">
              <span className="upload-step-n mono-label">02</span>
              <div>
                <div className="upload-step-title">Confirm your info</div>
                <div className="upload-step-desc">
                  We show exactly what we read — you fix anything that&rsquo;s off.
                </div>
              </div>
            </li>
            <li className="upload-step-item">
              <span className="upload-step-n mono-label">03</span>
              <div>
                <div className="upload-step-title">Hit search</div>
                <div className="upload-step-desc">
                  Your top 7 matches surface, strongest fit first — pulled from
                  thousands of live roles. Our engine does the heavy lifting.
                </div>
              </div>
            </li>
          </ol>
          <div className="upload-steps-foot mono-label">
            Free for job seekers · private to you
          </div>
        </div>
      </div>
    </AppShell>
  )
}
