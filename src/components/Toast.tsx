import { useCallback, useRef, useState } from 'react'
import './Toast.css'

/** Small transient confirmation toast, hook + component. */
export function useToast() {
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((m: string) => {
    setMsg(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2200)
  }, [])
  return { msg, show }
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="tc-toast" role="status">
      {msg}
    </div>
  )
}
