import { useCallback, useState } from 'react'
import { Notice } from '../../src/components/ui'

export const Head = ({ kicker, title, children }) => (<><p className="mono kicker">{kicker}</p><h1 className="h1">{title}</h1>{children && <p className="lede">{children}</p>}</>)

export const ErrorNote = ({ error }) => (error ? <Notice tone="error" title="Could not load">{error}</Notice> : null)

// One-line feedback after an action. `run(fn, okMessage)` runs it, shows the result, and never throws.
export function useFlash() {
  const [flash, setFlash] = useState(null)
  const run = useCallback(async (fn, ok) => {
    try { const r = await fn(); setFlash({ tone: 'ok', text: ok }); return r } catch (e) { setFlash({ tone: 'error', text: e.message }); return undefined }
  }, [])
  const node = flash ? <Notice tone={flash.tone}><span role="status">{flash.text}</span></Notice> : null
  return { run, node, setFlash }
}

export const STATUS_TONE = { completed: 'ok', 'in progress': 'neutral', 'not started': 'warn' }
