import { FEEDBACK } from '../../config/mission'

// Inline, subordinate feedback under the answer area. The wrapper is ALWAYS mounted so screen readers announce changes.
// `item` = { kind, sub?, note?, main? } where kind is a FEEDBACK key or 'notice' (rule-based refusals such as closed/late).
export default function AnswerFeedback({ id, item }) {
  const f = item && (item.kind === 'notice' ? { tone: 'bad', label: 'Notice', main: item.main } : FEEDBACK[item.kind])
  return (
    <div id={id} className="fbwrap" aria-live="polite" aria-atomic="true">
      {f && (
        <div className={`fb fb--${f.tone}`} key={`${item.kind}-${item.seq ?? 0}`}>
          <p className="mono fb__label">{f.label}</p>
          <p className="fb__main">{f.main}</p>
          {(item.sub || f.sub) && <p className="fb__sub">{item.sub || f.sub}</p>}
          {item.note && <p className="fb__sub">{item.note}</p>}
        </div>
      )}
    </div>
  )
}
