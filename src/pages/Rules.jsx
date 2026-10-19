import { RULES } from '../content/rules'
import { ROUNDS, EVENT } from '../config/eventConfig'
import { SectionHead, Status } from '../components/ui'

export default function Rules() {
  return (
    <div className="container block rules">
      <SectionHead kicker="Official regulations" title="Rules & regulations">
        Read these before the event. Organisers announce instructions, time limits, scoring criteria and qualification requirements before each round begins.
      </SectionHead>
      <div className="rules__grid">
        <nav className="toc" aria-label="Rules sections">
          <ol className="plain">{RULES.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
        </nav>
        <div className="rules__body">
          {RULES.map((s, i) => {
            const List = s.ordered ? 'ol' : 'ul'
            return (
              <section key={s.id} id={s.id} className="rule">
                <h2><span className="mono rule__idx">{String(i + 1).padStart(2, '0')}</span> {s.title}</h2>
                {s.pending && <Status tone="warn">To be announced</Status>}
                {s.intro && <p>{s.intro}</p>}
                {s.scoring && (
                  <table className="table">
                    <caption className="sr">Proposed maximum points per round</caption>
                    <thead><tr><th scope="col">Round</th><th scope="col">Name</th><th scope="col" className="num">Max points</th></tr></thead>
                    <tbody>
                      {ROUNDS.map((r) => <tr key={r.id}><td className="mono">{r.n}</td><td>{r.name}</td><td className="num mono">{r.points}</td></tr>)}
                      <tr><td /><th scope="row">Total (proposed)</th><td className="num mono">{EVENT.maxPoints}</td></tr>
                    </tbody>
                  </table>
                )}
                {s.items.length > 0 && <List className="rule__list">{s.items.map((t) => <li key={t}>{t}</li>)}</List>}
                {s.note && <p className="rule__note">{s.note}</p>}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
