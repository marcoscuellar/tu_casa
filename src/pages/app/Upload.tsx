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
  const { live, submitResume, pipelineError } = useAppFlow()
  const [parsing, setParsing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Fixtures mode: simulate the ~2s parse, then advance (sample profile is used).
  const startFixtureSim = () => {
    if (parsing) return
    setParsing(true)
    timer.current = setTimeout(() => navigate('/discovery'), 2000)
  }

  // Live mode: parse the real résumé with Claude, then advance on success.
  const startLive = async (upload: ResumeUpload) => {
    if (parsing) return
    setParsing(true)
    const ok = await submitResume(upload)
    if (ok) navigate('/discovery')
    else setParsing(false) // pipelineError is shown below
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!live) return startFixtureSim()
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await readFileAsBase64(file)
        await startLive({ kind: 'pdf', base64, filename: file.name })
      } else {
        const text = await file.text()
        await startLive({ kind: 'text', text, filename: file.name })
      }
    } catch {
      setParsing(false)
    }
  }

  const onSample = () => {
    if (!live) return startFixtureSim()
    void startLive({ kind: 'text', text: SAMPLE_RESUME_TEXT })
  }

  return (
    <AppShell>
      <div className="blk blk-black upload-block pop">
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
    </AppShell>
  )
}
