import { useEffect, useState } from 'react'
import { api } from '../api'
import { usePoll, toLocalInput, fromLocalInput } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'
import { Button, Loading, Status } from '../../../src/components/ui'
import { PROGRESSION_MODES, HINT_REVEAL } from '../../../src/config/mission'

const STATE = { open: ['ok', 'OPEN — teams can play'], locked: ['warn', 'LOCKED — opens later'], closed: ['error', 'CLOSED — window ended'], disabled: ['warn', 'DISABLED'], unconfigured: ['warn', 'NO WINDOW SET'] }

export default function Settings() {
  const gp = usePoll(api.getGameplay, 15000)
  const ms = usePoll(api.getSettings, 0)
  const { run, node } = useFlash()
  const [g, setG] = useState(null)
  useEffect(() => { if (gp.data && !g) setG({ enabled: gp.data.enabled, startsAt: toLocalInput(gp.data.startsAt), endsAt: toLocalInput(gp.data.endsAt), overrideMode: gp.data.overrideMode || '', overrideUntil: toLocalInput(gp.data.overrideUntil), confirmed: gp.data.confirmed }) }, [gp.data, g])

  const saveG = async (patch = {}) => {
    const next = { ...g, ...patch }
    setG(next)
    await run(() => api.saveGameplay({ enabled: next.enabled, startsAt: fromLocalInput(next.startsAt), endsAt: fromLocalInput(next.endsAt), overrideMode: next.overrideMode, overrideUntil: fromLocalInput(next.overrideUntil), confirmed: next.confirmed }), 'Mission window saved.')
    gp.reload()
  }
  const saveM = async (patch) => { await run(() => api.saveSettings(patch), 'Mission rules saved.'); ms.reload() }

  if (gp.error || ms.error) return (<><Head kicker="Config" title="Settings" /><ErrorNote error={gp.error || ms.error} /></>)
  if (!g || !ms.data) return <Loading />
  const [tone, label] = STATE[gp.data.state] || ['neutral', gp.data.state]
  const set = (k, v) => setG((x) => ({ ...x, [k]: v }))

  return (
    <>
      <Head kicker="Config" title="Settings">Everything here is enforced by the database, not by the website.</Head>
      {node}

      <section className="panel">
        <h2 className="panel__title">Mission window</h2>
        <p><Status tone={tone}>{label}</Status></p>
        <div className="btn-row">
          <Button type="button" variant="ghost" size="sm" onClick={() => saveG({ overrideMode: 'open', overrideUntil: '' })}>Open now (until I change it)</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => saveG({ overrideMode: 'closed', overrideUntil: '' })}>Close now</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => saveG({ overrideMode: '', overrideUntil: '' })}>Follow the schedule</Button>
        </div>
        <label className="check"><input type="checkbox" checked={g.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Gameplay enabled (master switch)</label>
        <div className="filters">
          <div className="field"><label htmlFor="gs">Opens at (this computer's time zone)</label><input id="gs" type="datetime-local" value={g.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></div>
          <div className="field"><label htmlFor="ge">Closes at</label><input id="ge" type="datetime-local" value={g.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></div>
        </div>
        <div className="filters">
          <div className="field"><label htmlFor="go">Override</label>
            <select id="go" value={g.overrideMode} onChange={(e) => set('overrideMode', e.target.value)}>
              <option value="">None: follow the schedule</option><option value="open">Force open</option><option value="closed">Force closed</option><option value="extend">Extend the closing time</option></select></div>
          <div className="field"><label htmlFor="gu">Override until (optional)</label><input id="gu" type="datetime-local" value={g.overrideUntil} onChange={(e) => set('overrideUntil', e.target.value)} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={g.confirmed} onChange={(e) => set('confirmed', e.target.checked)} /> Window confirmed (removes the "provisional" note on the website)</label>
        <div><Button type="button" onClick={() => saveG()}>Save window</Button></div>
        <p className="muted small">Teams outside the window cannot read questions or submit answers, even by calling the API directly.</p>
      </section>

      <section className="panel">
        <h2 className="panel__title">Progression rules</h2>
        <div className="field"><label htmlFor="pm">How teams unlock the next question</label>
          <select id="pm" value={ms.data.progressionMode} onChange={(e) => saveM({ progressionMode: e.target.value })}>{Object.entries(PROGRESSION_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <p className="field__hint">{PROGRESSION_MODES[ms.data.progressionMode]?.text}</p></div>
        <div className="field"><label htmlFor="hr">When location hints appear</label>
          <select id="hr" value={ms.data.hintReveal} onChange={(e) => saveM({ hintReveal: e.target.value })}>{Object.entries(HINT_REVEAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <p className="field__hint">{HINT_REVEAL[ms.data.hintReveal]?.text}</p></div>
      </section>
    </>
  )
}
