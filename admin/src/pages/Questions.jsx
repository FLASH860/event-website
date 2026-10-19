import { useEffect, useState } from 'react'
import { api } from '../api'
import { usePoll } from '../hooks'
import { Head, ErrorNote, useFlash } from '../bits'
import { COMPONENT_METHODS, QUESTION_TYPES, MISSION } from '../../../src/config/mission'
import { QuestionBody, HintPanel, AnswerForm } from '../../../src/components/mission/MissionParts'
import { Button, Loading } from '../../../src/components/ui'

const toDraft = (q) => ({ ...q, optionsText: (q.options || []).join('\n'), answersText: '', attemptsAllowed: q.attemptsAllowed ?? '', component: { ...q.component } })
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)

// Organiser editor. Accepted answers are WRITE-ONLY: they are hashed on the server and can never be read back, by anyone.
export default function Questions() {
  const { data: qs, error, reload } = usePoll(api.questions, 0)
  const settings = usePoll(api.getSettings, 0)
  const { run, node } = useFlash()
  const [i, setI] = useState(1), [draft, setDraft] = useState(null), [preview, setPreview] = useState(false)
  const [probe, setProbe] = useState(''), [probeRes, setProbeRes] = useState(null)

  useEffect(() => { if (qs) { const q = qs.find((x) => x.index === i); setDraft(q ? toDraft(q) : null); setPreview(false); setProbeRes(null) } }, [qs, i])

  if (error) return (<><Head kicker="Content" title="Questions" /><ErrorNote error={error} /></>)
  if (!qs || !draft) return <Loading label="Loading…" />

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setC = (k, v) => setDraft((d) => ({ ...d, component: { ...d.component, [k]: v } }))
  const save = async () => {
    const payload = {
      active: draft.active, title: draft.title, body: draft.body, type: draft.type, options: lines(draft.optionsText),
      caseSensitive: draft.caseSensitive, attemptsAllowed: draft.attemptsAllowed === '' ? null : Number(draft.attemptsAllowed),
      hintText: draft.hintText,
      component: { code: draft.component.code, locationNote: draft.component.locationNote, method: draft.component.method, requiredForProgression: draft.component.requiredForProgression, active: draft.component.active },
    }
    if (lines(draft.answersText).length) payload.acceptedAnswers = lines(draft.answersText)
    const ok = await run(() => api.saveQuestion(i, payload), `Question ${i} saved.`)
    if (ok !== undefined) reload()
  }
  const check = async () => { try { setProbeRes(await api.checkAnswer(i, probe)) } catch (e) { setProbeRes(e.message) } }

  return (
    <>
      <Head kicker="Content" title="Questions">The four Digital Transmission questions. Teams only ever see a question after they have unlocked it, and never see the answers.</Head>
      {node}

      <div className="qprog" role="tablist" aria-label="Questions">
        {Array.from({ length: MISSION.questionCount }, (_, n) => n + 1).map((n) => {
          const q = qs.find((x) => x.index === n)
          return (<li key={n} className={`qprog__item ${i === n ? 'is-sel' : ''}`} style={{ listStyle: 'none' }}>
            <button role="tab" aria-selected={i === n} onClick={() => setI(n)}><span className="mono qprog__n">Q{n}</span><span className="qprog__s">{q?.active ? 'Active' : 'Inactive'}</span></button></li>)
        })}
      </div>

      <div className="panel">
        <div className="field"><label htmlFor="qt">Title</label><input id="qt" value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength="200" /></div>
        <div className="field"><label htmlFor="qb">Instructions</label><textarea id="qb" rows="5" value={draft.body} onChange={(e) => set('body', e.target.value)} /></div>
        <div className="field"><label htmlFor="qy">Answer type</label><select id="qy" value={draft.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        {draft.type === 'choice' && <div className="field"><label htmlFor="qo">Options (one per line)</label><textarea id="qo" rows="4" value={draft.optionsText} onChange={(e) => set('optionsText', e.target.value)} /></div>}

        <div className="field"><label htmlFor="qa">Accepted answers (one per line)</label>
          <textarea id="qa" rows="3" value={draft.answersText} onChange={(e) => set('answersText', e.target.value)} placeholder={draft.answerCount ? `${draft.answerCount} answer${draft.answerCount === 1 ? '' : 's'} stored. Leave empty to keep them; type new ones to REPLACE all.` : 'No answers stored yet'} />
          <p className="field__hint">Hashed on the server the moment you save. They cannot be read back, not even here. Matching ignores extra spaces{draft.caseSensitive ? '' : ' and capitalisation'}. For multiple choice, enter the exact correct option.</p></div>
        <div className="row">
          <div className="field"><label htmlFor="qp">Test an answer against the saved ones</label><input id="qp" value={probe} onChange={(e) => { setProbe(e.target.value); setProbeRes(null) }} /></div>
          <Button type="button" variant="ghost" onClick={check} disabled={!probe}>Test</Button>
          {probeRes !== null && <span role="status" className={`pill ${probeRes === true ? 'pill--ok' : 'pill--bad'}`}>{probeRes === true ? 'Accepted' : probeRes === false ? 'NOT accepted' : probeRes}</span>}
        </div>

        <label className="check"><input type="checkbox" checked={draft.caseSensitive} onChange={(e) => set('caseSensitive', e.target.checked)} /> Case-sensitive</label>
        <div className="filters">
          <div className="field"><label htmlFor="at">Attempts allowed</label><input id="at" type="number" min="1" placeholder="Unlimited" value={draft.attemptsAllowed} onChange={(e) => set('attemptsAllowed', e.target.value)} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} /> Question active (inactive questions stay locked for every team; needs at least one accepted answer)</label>

        <h3 className="panel__title">Location hint &amp; component</h3>
        <div className="field"><label htmlFor="ht">Hint text (hidden until the team earns it)</label><textarea id="ht" rows="3" value={draft.hintText} onChange={(e) => set('hintText', e.target.value)} /></div>
        <div className="filters">
          <div className="field"><label htmlFor="ci">Component ID / name</label><input id="ci" value={draft.component.code} onChange={(e) => setC('code', e.target.value)} /></div>
          <div className="field"><label htmlFor="cm">Verification method</label><select id="cm" value={draft.component.method} onChange={(e) => setC('method', e.target.value)}>{Object.entries(COMPONENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="cl">Checkpoint location note (organisers only, never sent to teams)</label><input id="cl" value={draft.component.locationNote} onChange={(e) => setC('locationNote', e.target.value)} /></div>
        <label className="check"><input type="checkbox" checked={draft.component.requiredForProgression} onChange={(e) => setC('requiredForProgression', e.target.checked)} /> Component recovery counts towards progression (see Settings)</label>
        <label className="check"><input type="checkbox" checked={draft.component.active} onChange={(e) => setC('active', e.target.checked)} /> Checkpoint active</label>
        {draft.component.method === 'qr' && <p className="muted small">QR tokens are created on the Checkpoints page. {draft.component.tokenSet ? 'A token exists for this question.' : 'No token yet.'}</p>}

        <div className="row"><Button type="button" onClick={save}>Save question {i}</Button><Button type="button" variant="ghost" onClick={() => setPreview(!preview)}>{preview ? 'Hide preview' : 'Preview as a team'}</Button></div>
        {preview && (
          <div className="qpanel" aria-label="Preview">
            <p><span className="pill">Preview, not published</span></p>
            <QuestionBody q={{ ...draft, index: i }} />
            <AnswerForm question={{ ...draft, options: lines(draft.optionsText) }} onSubmit={async () => {}} disabled />
            <HintPanel hint={{ status: 'unlocked', text: draft.hintText }} settings={settings.data || { hintReveal: 'on_correct_answer' }} />
          </div>)}
      </div>
    </>
  )
}
