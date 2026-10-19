import { MISSION } from '../../config/mission'

const WORD = { solved: 'Solved', available: 'Open', locked: 'Locked' }

// Vertical log of the four missions. One thin line connects the steps. State is carried by marker shape AND text.
// Every step can be selected; a locked one explains that the previous mission comes first.
export default function MissionLog({ questions, current, selected, onSelect }) {
  const slots = Array.from({ length: MISSION.questionCount }, (_, i) => questions.find((q) => q.index === i + 1) || { index: i + 1, status: 'locked' })
  return (
    <ol className="mlog" aria-label="Digital Transmission questions">
      {slots.map((q) => {
        const isCur = current === q.index
        const inner = (<>
          <span className="mlog__mark" aria-hidden="true">{q.status === 'solved' ? '✓' : ''}</span>
          <span className="mlog__n mono">Q{q.index}</span>
          <span className="mlog__w">{WORD[q.status] || 'Locked'}{isCur ? ' · now' : ''}</span>
        </>)
        return (
          <li key={q.index} className={`mlog__item mlog__item--${q.status} ${isCur ? 'is-now' : ''} ${selected === q.index ? 'is-sel' : ''}`}>
            <button type="button" onClick={() => onSelect(q.index)} aria-current={selected === q.index ? 'step' : undefined}>{inner}</button>
          </li>
        )
      })}
    </ol>
  )
}
