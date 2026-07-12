import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import './flow.css'
import './Upload.css'

export function Upload() {
  const navigate = useNavigate()
  const [parsing, setParsing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // In production this is replaced by the real parse/extract job; when it
  // completes, advance to Discovery. Here we simulate the ~2s parse.
  const startParse = () => {
    if (parsing) return
    setParsing(true)
    timer.current = setTimeout(() => navigate('/discovery'), 2000)
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
                accept=".pdf,.docx,.doc,.txt,text/plain"
                hidden
                onChange={startParse}
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
                  onClick={startParse}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && startParse()}
                >
                  Use a sample to look around →
                </a>
              </p>
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
