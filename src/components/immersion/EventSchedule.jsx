import { EVENT } from '../../config/eventConfig'

const f = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// Event-wide schedule: the same for every team. Round timers are separate and per team.
export default function EventSchedule() {
  const { startsAt, endsAt } = EVENT.schedule
  return (
    <div className="panel">
      <p className="mono muted">Event schedule · official, all teams</p>
      <dl className="sched">
        <div><dt className="mono">Scheduled start</dt><dd>{f(startsAt)}</dd></div>
        <div><dt className="mono">Scheduled end</dt><dd>{f(endsAt)}</dd></div>
        <div><dt className="mono">Venue</dt><dd>{EVENT.venue}</dd></div>
      </dl>
      <p className="muted small">Round timers are separate: each has its own start and deadline, and teams may not start at the same moment. Schedule changes will appear in Announcements once connected.</p>
    </div>
  )
}
