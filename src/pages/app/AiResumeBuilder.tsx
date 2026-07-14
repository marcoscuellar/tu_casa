import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { buildResume, draftToParsedResume, draftToResumeDoc } from '../../lib/aiResume'
import { saveDoc } from '../../lib/resumeDoc'
import {
  AI_BUILDER_GREETING,
  emptyDraft,
  type AiResumeDraft,
  type AiTurn,
} from '../../engines/live/aiResumeBuilder'
import './flow.css'
import './AiResumeBuilder.css'

/**
 * AI résumé builder (board turn 16). A short chat turns plain answers into a
 * structured draft (LLM seam via /api/build-resume); the live preview is fully
 * editable; "Use this résumé →" converts the draft to a ParsedResume and drops
 * it into the same confirm → discovery flow as an upload.
 */
export function AiResumeBuilder() {
  const navigate = useNavigate()
  const { adoptResume } = useAppFlow()

  const [chat, setChat] = useState<AiTurn[]>([
    { role: 'assistant', content: AI_BUILDER_GREETING },
  ])
  const [draft, setDraft] = useState<AiResumeDraft>(emptyDraft)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: AiTurn[] = [...chat, { role: 'user', content: text }]
    setChat(next)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const { reply, draft: newDraft } = await buildResume(next)
      setChat((c) => [...c, { role: 'assistant', content: reply }])
      setDraft(newDraft)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  /* preview edits */
  const patch = (p: Partial<AiResumeDraft>) => setDraft((d) => ({ ...d, ...p }))
  const setExpBullet = (i: number, bullet: string) =>
    setDraft((d) => ({
      ...d,
      experience: d.experience.map((e, ei) => (ei === i ? { ...e, bullet } : e)),
    }))
  const removeChip = (key: 'industries' | 'skills', val: string) =>
    patch({ [key]: draft[key].filter((x) => x !== val) } as Partial<AiResumeDraft>)
  const addChip = (key: 'industries' | 'skills', val: string) => {
    const v = val.trim()
    if (v && !draft[key].some((x) => x.toLowerCase() === v.toLowerCase())) {
      patch({ [key]: [...draft[key], v] } as Partial<AiResumeDraft>)
    }
  }

  const hasContent = Boolean(draft.headline || draft.experience.length || draft.skills.length)

  const useResume = () => {
    adoptResume(draftToParsedResume(draft))
    navigate('/confirm')
  }
  const download = () => {
    saveDoc(draftToResumeDoc(draft))
    navigate('/builder')
  }

  return (
    <AppShell>
      <div className="air pop">
        {/* Chat */}
        <div className="air-chat">
          <div className="air-chat-head">
            <div className="air-tc">tc</div>
            <div className="air-chat-title">Résumé builder</div>
            <span className="air-badge">No résumé needed</span>
          </div>
          <div className="air-msgs" ref={scrollRef}>
            {chat.map((m, i) => (
              <div key={i} className={`air-msg air-msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="air-msg air-msg-assistant air-typing">…</div>}
            {error && <div className="air-error">{error}</div>}
          </div>
          <div className="air-input-row">
            <input
              className="air-input"
              placeholder="Type your answer…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className="air-send" onClick={send} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="air-preview">
          <div className="air-preview-head">
            <div className="air-preview-eyebrow mono-label">Building live</div>
            <span className="air-editable">✎ Editable</span>
          </div>
          <div className="air-paper">
            <div>
              <input
                className="air-name"
                placeholder="Your name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
              <input
                className="air-headline"
                placeholder="Target role"
                value={draft.headline}
                onChange={(e) => patch({ headline: e.target.value })}
              />
            </div>
            <div className="air-rule" />

            <div className="air-sec">
              <div className="air-sec-label mono-label">
                Experience <span className="air-pen">✎</span>
              </div>
              {draft.experience.length > 0 ? (
                draft.experience.map((e, i) => (
                  <div key={i} className="air-exp">
                    <div className="air-exp-title">
                      {e.title}
                      {e.years ? ` · ${e.years} yrs` : ''}
                    </div>
                    <textarea
                      className="air-exp-bullet"
                      rows={2}
                      value={e.bullet}
                      onChange={(ev) => setExpBullet(i, ev.target.value)}
                    />
                  </div>
                ))
              ) : (
                <div className="air-empty">Tell me about a past job in the chat →</div>
              )}
            </div>

            <div className="air-sec">
              <div className="air-sec-label mono-label">
                Industry <span className="air-pen">✎</span>
              </div>
              <div className="air-chips">
                {draft.industries.map((s) => (
                  <span key={s} className="air-chip air-chip-teal">
                    {s}
                    <button className="air-chip-x" onClick={() => removeChip('industries', s)}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="air-chip-add"
                  placeholder="+ Add"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addChip('industries', newIndustry)
                      setNewIndustry('')
                    }
                  }}
                />
              </div>
            </div>

            <div className="air-sec">
              <div className="air-sec-label mono-label">
                Skills <span className="air-pen">✎</span>
              </div>
              <div className="air-chips">
                {draft.skills.map((s) => (
                  <span key={s} className="air-chip air-chip-neutral">
                    {s}
                    <button className="air-chip-x air-chip-x-dark" onClick={() => removeChip('skills', s)}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="air-chip-add"
                  placeholder="+ Add"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addChip('skills', newSkill)
                      setNewSkill('')
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="air-note">
            Tap any field to edit before you use it.
            <br />
            <span className="air-disclosure">AI-generated — always review before you send.</span>
          </div>

          <div className="air-actions">
            <button className="air-use" onClick={useResume} disabled={!hasContent}>
              Use this résumé →
            </button>
            <button className="air-download" onClick={download} disabled={!hasContent}>
              Download
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
