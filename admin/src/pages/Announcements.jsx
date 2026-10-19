import { api } from '../api'
import { usePoll } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'
import { Loading, Status } from '../../../src/components/ui'

export default function Announcements() {
  const { data: rows, error, reload } = usePoll(api.announcements, 0)
  const { run, node } = useFlash()
  const post = async (e) => {
    e.preventDefault()
    const form = e.currentTarget, f = new FormData(form)
    const r = await run(() => api.saveAnnouncement({ title: f.get('title'), body: f.get('body'), kind: f.get('kind') }), 'Published to all teams.')
    if (r !== undefined) { form.reset(); reload() }
  }
  return (
    <>
      <Head kicker="Updates" title="Announcements">Event-wide notices. Teams see them on their Announcements page within about 45 seconds. Material changes to schedule or rules must reach every team.</Head>
      <ErrorNote error={error} />
      {node}
      <form className="panel" onSubmit={post}>
        <label>Title<input name="title" maxLength="120" required /></label>
        <label>Message<textarea name="body" rows="4" maxLength="1000" required /></label>
        <label>Type<select name="kind"><option value="info">Information</option><option value="schedule">Schedule change</option><option value="safety">Safety notice</option></select></label>
        <div><button className="btn btn--primary" type="submit">Publish</button></div>
      </form>
      {!rows ? <Loading /> : rows.map((a) => (
        <div className="panel" key={a.id}><Status tone={a.kind === 'safety' ? 'warn' : 'neutral'}>{a.kind}</Status><h2 className="panel__title">{a.title}</h2><p>{a.body}</p><p className="mono muted">{new Date(a.at).toLocaleString()}</p>
          <div><button className="btn btn--ghost btn--sm" type="button" onClick={async () => { if (window.confirm('Retract this announcement? Teams will no longer see it.')) { await run(() => api.retractAnnouncement(a.id), 'Retracted.'); reload() } }}>Retract</button></div></div>))}
    </>
  )
}
