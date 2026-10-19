import { useEffect, useRef, useState } from 'react'
import { SEQUENCE, FEEDBACK, pad2 } from '../../config/mission'
import { Button } from '../ui'

// Location intelligence: the hint exactly as the server released it. Never invented; "unavailable" when not released.
export function Intel({ q, final }) {
  const f = SEQUENCE.final
  const text = q.hint?.status === 'unlocked' ? q.hint.text : null
  return (
    <div className="intel" id={final ? 'field-intel' : undefined} tabIndex={final ? -1 : undefined}>
      <p className="mono intel__label">{SEQUENCE.intel.label}</p>
      {text ? <p className="intel__text">{text}</p> : <p className="intel__text intel__text--off">{f.unavailable}</p>}
      {text && q.component?.id && <p className="mono intel__id">Designated component · {q.component.id}</p>}
      <p className="intel__rules">{final ? f.instructions : SEQUENCE.intel.field}</p>
    </div>
  )
}

// One reusable sequence for ALL four questions (data-driven numbers).
//  - Questions 1..N-1: verified -> objective complete -> proceed to the next question.
//  - Final question: Digital Transmission complete -> field deployment -> the real hint -> acknowledge.
// `fresh` = the team has just been confirmed correct (staged reveal + focus on the next action); otherwise a quiet revisit.
export default function MissionSequence({ q, total, fresh, onProceed }) {
  const isFinal = q.index === total
  const next = !isFinal && q.nextUnlocked ? q.index + 1 : null // only when the server state says it is unlocked
  const act = useRef(null)
  const [ack, setAck] = useState(false) // acknowledgement is presentation only (not persisted)
  useEffect(() => { if (fresh) act.current?.focus({ preventScroll: false }) }, [fresh])

  if (isFinal) {
    const f = SEQUENCE.final, hasHint = q.hint?.status === 'unlocked'
    return (
      <section className={`seq seq--final ${fresh ? 'seq--fresh' : ''}`} aria-labelledby={`seq-h-${q.index}`} role="status">
        {fresh && <p className="mono seq__label">{SEQUENCE.received.main}</p>}
        <p className="seq__obj"><span className="seq__tick" aria-hidden="true">✓</span>{SEQUENCE.objective(q.index)}</p>
        <p className="mono seq__kicker">{f.kicker}</p>
        <h3 id={`seq-h-${q.index}`} className="seq__h">{f.main}</h3>
        <p className="seq__h2">{f.sub2}</p>
        <p className="seq__sub">{f.body}</p>
        <div className="seq__deploy">
          <p className="seq__nh">{f.deploy}</p>
          <p className="seq__sub">{f.deployBody}</p>
        </div>
        <Intel q={q} final />
        {hasHint
          ? <Button ref={act} type="button" variant={ack ? 'ghost' : undefined} onClick={() => setAck(true)} disabled={ack}>{ack ? f.acknowledged : f.acknowledge}</Button>
          : <Button ref={act} type="button" onClick={() => { const el = document.getElementById('field-intel'); el?.scrollIntoView({ block: 'center' }); el?.focus() }}>{f.review}</Button>}
        <p className="seq__signoff">{f.signoff}</p>
      </section>
    )
  }

  return (
    <section className={`seq ${fresh ? 'seq--fresh' : ''}`} aria-labelledby={`seq-h-${q.index}`} role="status">
      {fresh
        ? <><p className="mono seq__label">{SEQUENCE.received.label}</p><h3 id={`seq-h-${q.index}`} className="seq__h">{SEQUENCE.received.main}</h3><p className="seq__sub">{SEQUENCE.received.sub}</p></>
        : <><p className="mono seq__label">{FEEDBACK.complete.label}</p><h3 id={`seq-h-${q.index}`} className="seq__h seq__h--quiet">{FEEDBACK.complete.main}</h3></>}
      <p className="seq__obj"><span className="seq__tick" aria-hidden="true">✓</span>{SEQUENCE.objective(q.index)}</p>
      {next && (
        <div className="seq__next">
          <p className="seq__nh">{SEQUENCE.next.main}</p>
          <p className="seq__sub">{SEQUENCE.next.sub(next)}</p>
          <Button ref={act} type="button" onClick={() => onProceed(next)}>{SEQUENCE.next.cta(next)}</Button>
        </div>
      )}
      {q.hint?.status === 'unlocked' && <Intel q={q} />}
    </section>
  )
}
export { pad2 }
