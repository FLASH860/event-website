import { Link } from 'react-router-dom'
import RegisterLink from '../components/gate/RegisterLink'
import { Notice } from '../components/ui'
import { EVENT } from '../config/eventConfig'

// Registration happens on an external form. This page explains it and links out; it never collects or "submits" anything.
export default function Register() {
  return (
    <div className="container block narrow">
      <p className="mono kicker">Team registration</p>
      <h1 className="h1">Register your team</h1>
      <p className="lede">Teams of {EVENT.teamSize}. Registration fee: {EVENT.fee}. Registration is completed on the organisers’ official form, outside this website.</p>
      <dl className="details" style={{ margin: '1.5rem 0' }}>
        <div><dt className="mono">Team size</dt><dd>{EVENT.teamSize}</dd></div>
        <div><dt className="mono">Fee</dt><dd>{EVENT.fee}</dd></div>
        {EVENT.registrationDeadline && <div><dt className="mono">Register by</dt><dd>{EVENT.registrationDeadline}</dd></div>}
      </dl>
      <RegisterLink>Open the registration form</RegisterLink>
      <Notice tone="info" title="After you register">Registering does not log you in. Team accounts are issued by the organisers; you will then use <Link className="link" to="/login">team login</Link> when the mission opens.</Notice>
    </div>
  )
}
