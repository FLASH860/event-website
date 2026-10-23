import { useEffect, useState } from 'react'
import { MISSION, RESULT_COPY } from '../../config/mission'
import { submitAnswer } from '../../lib/missionApi'
import { QuestionBody, AnswerForm } from './MissionParts'
import AnswerFeedback from './AnswerFeedback'
import MissionSequence, { Intel } from './MissionSequence'
import Puzzle from '../puzzles'

// The working surface of the dashboard: read the question, answer it, see the server's verdict.
// Logic is unchanged from the old Question page (server validates; success is shown only after the server accepts).
export default function QuestionPanel({ state, setState, sel, onProceed }) {
  const [busy, setBusy] = useState(false)
  const [fb, setFb] = useState(null)
  const q = state.questions.find((x) => x.index === sel)

  useEffect(() => { setFb(null) }, [sel]) // feedback belongs to one question
  const say = (item) => setFb({ ...item, seq: Date.now() })

  async function onSubmit(answer) {
    setBusy(true); setFb(null)
    try {
      const r = await submitAnswer(sel, answer)
      if (r.result === 'correct') {
        setState(r.state)
        say({ kind: 'correct' }) // the sequence below reads the server state; nothing is claimed beyond it
      } else if (r.result === 'incorrect') {
        const left = q.attemptsAllowed != null ? Math.max(0, q.attemptsAllowed - (q.attemptsUsed + 1)) : null
        say({ kind: 'incorrect', note: left != null ? `Attempts left: ${left}.` : undefined }) // never reveals the answer
        setState({ ...state, questions: state.questions.map((x) => (x.index === sel ? { ...x, attemptsUsed: x.attemptsUsed + 1 } : x)) })
      } else if (r.result === 'already_solved') {
        say({ kind: 'complete' })
      } else if (r.result === 'network' || !RESULT_COPY[r.result]) {
        say({ kind: 'error' })
      } else {
        say({ kind: 'notice', main: RESULT_COPY[r.result] }) // locked, attempts exhausted, closed, late: wording unchanged
      }
    } catch (e) { e.code === 'closed' ? say({ kind: 'notice', main: RESULT_COPY.closed }) : say({ kind: 'error' }) }
    setBusy(false)
  }

  if (!q || q.status === 'locked') return (
    <div className="qp qp--locked"><p className="mono muted">Mission {sel} · Locked</p><p>{sel > 1 && state.questions.find((x) => x.index === sel - 1)?.status === 'solved' ? 'This mission has not been released yet. Check back soon.' : 'Solve the previous question first.'}</p></div>)

  return (
    <div className="qp" key={q.index}>
      <QuestionBody q={q} total={MISSION.questionCount} />
      {q.status === 'solved'
        ? <MissionSequence q={q} total={MISSION.questionCount} fresh={fb?.kind === 'correct'} onProceed={onProceed} />
        : <>
            <Puzzle index={q.index} />
            <AnswerForm key={q.index} question={q} onSubmit={onSubmit} onEmpty={() => say({ kind: 'empty' })} onEdit={() => fb?.kind === 'empty' && setFb(null)} busy={busy} describedBy="answer-feedback" />
            {q.attemptsAllowed != null && <p className="muted small">Attempts used: {q.attemptsUsed} of {q.attemptsAllowed}</p>}
            <AnswerFeedback id="answer-feedback" item={busy ? { kind: 'verifying' } : fb} />
            {q.hint?.status === 'unlocked' && <Intel q={q} />}
          </>}
    </div>
  )
}
