import { Link } from 'react-router-dom'
import { Button, SectionHead } from '../components/ui'
import StartPlayingButton from '../components/gate/StartPlayingButton'
import { EVENT, ROUNDS } from '../config/eventConfig'
import { IMAGERY } from '../config/imagery'
import HeroTitle, { useTitleIntro } from '../components/HeroTitle'

const SUMMARY = [
  ['Participation', `Teams of ${EVENT.teamSize}, open to eligible participants from different colleges. Follow organiser and volunteer instructions throughout.`],
  ['Fair play', 'No unauthorised help, no sharing answers or clues with other teams, no tampering with equipment or clues.'],
  ['Safety', 'Stay inside approved areas, handle equipment only as instructed, and report damage or hazards immediately.'],
  ['Qualification', 'Teams are filtered between rounds. Never assume automatic qualification unless organisers say so.'],
  ['Organiser authority', "Judges' decisions are final, subject to the stated review process. Schedules may change for safety or technical reasons."],
]

export default function Home() {
  const { play, assembling } = useTitleIntro()
  return (
    <>
      <section className={`hero ${IMAGERY.hero ? 'hero--img' : ''}`} style={IMAGERY.hero ? { '--img': `url(${IMAGERY.hero})` } : undefined}>
        <div className="container hero__in" data-intro={play ? 'play' : undefined}>
          <p className="mono kicker">{EVENT.host} presents</p>
          <HeroTitle assembling={assembling} />
          <p className="hero__line hero__after">Decode the transmission. Recover the components. Control the robot. Activate the Robo-Core.</p>
          <p className="hero__desc hero__after">An inter-college robotics mission combining digital puzzles, technical reasoning, campus clue hunts, and a hands-on robot obstacle challenge.</p>
          <div className="hero__actions hero__after">
            <Button to="/signup">Create account</Button>
            <Button to="/login" variant="ghost">Log in</Button>
            <StartPlayingButton variant="ghost" />
          </div>
          <dl className="facts hero__after">
            <div><dt className="mono">Date</dt><dd>{EVENT.dateShort}</dd></div>
            <div><dt className="mono">Time</dt><dd>{EVENT.time}</dd></div>
            <div><dt className="mono">Venue</dt><dd>{EVENT.venue}</dd></div>
            <div><dt className="mono">Team</dt><dd>{EVENT.teamSize}</dd></div>
            <div><dt className="mono">Fee</dt><dd>{EVENT.fee}</dd></div>
            {EVENT.prizePool && <div><dt className="mono">Prize pool</dt><dd>{EVENT.prizePool}</dd></div>}
          </dl>
        </div>
      </section>

      <section className="block" id="briefing">
        <div className="container split">
          <SectionHead kicker="The premise" title="A damaged robot. One window to recover it." />
          <div className="prose">
            <p>Your team has been handed a robot system that has been badly damaged. To bring it back, you will answer four questions, each one unlocking the next.</p>
            <p>Solve a question and it reveals where to go next. Recover each component at its approved checkpoint by scanning the QR code there.</p>
          </div>
        </div>
      </section>

      <section className="block block--alt" id="rounds">
        <div className="container">
          <SectionHead kicker="Five rounds" title="The mission, in order" >
            Proposed maximum of {EVENT.maxPoints} points. Detailed scoring, time limits and qualification cutoffs are announced before each round.
          </SectionHead>
          <ol className="rounds">
            {ROUNDS.map((r) => (
              <li key={r.id} className="round">
                <span className="round__n mono">{String(r.n).padStart(2, '0')}</span>
                <div className="round__body"><h3>{r.name}</h3><p>{r.blurb}</p></div>
                <span className="round__pts mono">{r.points}<small> pts</small></span>
              </li>
            ))}
            <li className="round round--total">
              <span className="round__n" aria-hidden="true" />
              <div className="round__body"><h3>Proposed maximum</h3></div>
              <span className="round__pts mono">{EVENT.maxPoints}<small> pts</small></span>
            </li>
          </ol>
        </div>
      </section>

      <section className="block">
        <div className="container">
          <SectionHead kicker="Take part" title="Event details" align="center" />
          <dl className="details">
            <div><dt className="mono">Date</dt><dd>{EVENT.dateLabel}</dd></div>
            <div><dt className="mono">Time</dt><dd>{EVENT.time}</dd></div>
            <div><dt className="mono">Venue</dt><dd>{EVENT.venue}</dd></div>
            <div><dt className="mono">Format</dt><dd>{EVENT.type}</dd></div>
            <div><dt className="mono">Team size</dt><dd>{EVENT.teamSize}</dd></div>
            <div><dt className="mono">Registration fee</dt><dd>{EVENT.fee}</dd></div>
          </dl>
        </div>
      </section>

      <section className="block block--alt">
        <div className="container">
          <SectionHead kicker="Rules at a glance" title="Short version" align="center" />
          <dl className="summary">
            {SUMMARY.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
          </dl>
          <p className="cta-center"><Link className="link" to="/rules">Read the complete rules →</Link></p>
        </div>
      </section>

      <section className="block final-cta">
        <div className="container">
          <h2 className="final-cta__title">Are you ready to accept the mission?</h2>
          <p className="lede">{EVENT.dateLabel} · {EVENT.time} · {EVENT.venue}</p>
          <div className="hero__actions">
            <Button to="/signup">Create account</Button>
            <StartPlayingButton variant="ghost" />
          </div>
        </div>
      </section>
    </>
  )
}
