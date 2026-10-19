import { useEffect, useState } from 'react'
import { adminGetSettings, adminSaveSettings, adminListQuestions, adminSaveQuestion } from '../../lib/missionApi'
import { PROGRESSION_MODES, HINT_REVEAL, COMPONENT_METHODS, QUESTION_TYPES, MISSION } from '../../config/mission'
import { QuestionBody, HintPanel, AnswerForm } from '../../components/mission/MissionParts'
import { Button, Notice, Loading } from '../../components/ui'
import { MOCK_DATA } from '../../lib/mock'
import { NotConnectedError } from '../../lib/supabase'

// Organiser editor. Accepted answers are entered here and stored ONLY on the server; they never reach team browsers.
export default function Questions() {
  const [settings, setSettings] = useState(null), [qs, setQs] = useState(null), [err, setErr] = useState(null)
  const [i, setI] = useState(1), [draft, setDraft] = useState(null), [msg, setMsg] = useState(null), [preview, setPreview] = useState(false)

  useEffect(() => { Promise.all([adminGetSettings(), adminListQuestions()]).then(([s, q]) => { setSettings(s); setQs(q) }).catch((e) => setErr(e)) }, [])
  useEffect(() => { if (qs) { const q = qs.find((x) => x.index === i); setDraft(q ? { ...q, acceptedText: (q.accepted || []).join('\n'), optionsText: (q.options || []).join('\n') } : null); setPreview(false) } }, [qs, i])

  if (err) return (<><h1 className="h1">Questions</h1><Notice tone="warn" title={err instanceof NotConnectedError ? 'Backend not connected' : 'Could not load'}>{err instanceof NotConnectedError ? 'Question management needs the backend. See docs/BACKEND_HANDOVER.md.' : 'Please refresh.'}</Notice></>)
  if (!qs || !settings) return <Loading label="Loading…" />

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setC = (k, v) => setDraft((d) => ({ ...d, component: { ...d.component, [k]: v } }))
  const saveSettings = async (patch) => { setSettings(await adminSaveSettings(patch)); setMsg('Settings saved and recorded in the audit trail.') }
  const save = async () => {
    const { acceptedText, optionsText, ...rest } = draft
    const q = { ...rest, accepted: acceptedText.split('\n').map((x) => x.trim()).filter(Boolean), options: optionsText.split('\n').map((x) => x.trim()).filter(Boolean),
      attemptsAllowed: rest.attemptsAllowed === '' || rest.attemptsAllowed == null ? null : Number(rest.attemptsAllowed), penalty: rest.penalty === '' || rest.penalty == null ? null : Number(rest.penalty) }
    await adminSaveQuestion(i, q); setQs(await adminListQuestions()); setMsg(`Question ${i} saved.`)
  }

  return (
    <>
      <p className="mono kicker">Content</p>
      <h1 className="h1">Questions &amp; progression</h1>
      {MOCK_DATA && <Notice tone="warn" title="Demo data">Stored in this browser by the dev mock. Real content is entered here once the backend is connected.</Notice>}
      {msg && <Notice tone="ok"><span role="status">{msg}</span></Notice>}

      <div className="panel">
        <h2 className="panel__title">Progression rules</h2>
        <div className="field"><label htmlFor="pm">How teams unlock the next question</label>
          <select id="pm" value={settings.progressionMode} onChange={(e) => saveSettings({ progressionMode: e.target.value })}>
            {Object.entries(PROGRESSION_MODES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <p className="field__hint">{PROGRESSION_MODES[settings.progressionMode]?.text}</p></div>
        <div className="field"><label htmlFor="hr">When location hints appear</label>
          <select id="hr" value={settings.hintReveal} onChange={(e) => saveSettings({ hintReveal: e.target.value })}>
            {Object.entries(HINT_REVEAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <p className="field__hint">{HINT_REVEAL[settings.hintReveal]?.text}</p></div>
      </div>

      <div className="qprog" role="tablist" aria-label="Questions" style={{ marginTop: 'var(--gap)' }}>
        {Array.from({ length: MISSION.questionCount }, (_, n) => n + 1).map((n) => (
          <li key={n} className={`qprog__item ${i === n ? 'is-sel' : ''}`} style={{ listStyle: 'none' }}><button role="tab" aria-selected={i === n} onClick={() => setI(n)}><span className="mono qprog__n">Q{n}</span><span className="qprog__s">Edit</span></button></li>))}
      </div>

      {draft && (
        <div className="panel">
          <div className="field"><label htmlFor="qt">Title</label><input id="qt" value={draft.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="field"><label htmlFor="qb">Instructions</label><textarea id="qb" rows="5" value={draft.body} onChange={(e) => set('body', e.target.value)} /></div>
          <div className="field"><label htmlFor="qy">Answer type</label><select id="qy" value={draft.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          {draft.type === 'choice' && <div className="field"><label htmlFor="qo">Options (one per line)</label><textarea id="qo" rows="4" value={draft.optionsText} onChange={(e) => set('optionsText', e.target.value)} /></div>}
          <div className="field"><label htmlFor="qa">Accepted answers (one per line)</label><textarea id="qa" rows="3" value={draft.acceptedText} onChange={(e) => set('acceptedText', e.target.value)} />
            <p className="field__hint">Stored only on the server. Matching ignores extra spaces{draft.caseSensitive ? '' : ' and capitalisation'}.</p></div>
          <label className="check"><input type="checkbox" checked={draft.caseSensitive} onChange={(e) => set('caseSensitive', e.target.checked)} /> Case-sensitive</label>
          <div className="filters">
            <div className="field"><label htmlFor="at">Attempts allowed</label><input id="at" type="number" min="1" placeholder="Unlimited" value={draft.attemptsAllowed ?? ''} onChange={(e) => set('attemptsAllowed', e.target.value)} /></div>
            <div className="field"><label htmlFor="pn">Penalty per wrong attempt</label><input id="pn" type="number" min="0" placeholder="None" value={draft.penalty ?? ''} onChange={(e) => set('penalty', e.target.value)} /><p className="field__hint">Only applied if you enter a value. Scoring is not implemented yet.</p></div>
          </div>
          <label className="check"><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} /> Question active (inactive questions stay locked for every team)</label>

          <h3 className="panel__title">Location hint &amp; component</h3>
          <div className="field"><label htmlFor="ht">Hint text (private until released)</label><textarea id="ht" rows="3" value={draft.hint.text} onChange={(e) => set('hint', { ...draft.hint, text: e.target.value })} /></div>
          <div className="filters">
            <div className="field"><label htmlFor="ci">Component ID</label><input id="ci" value={draft.component.id} onChange={(e) => setC('id', e.target.value)} /></div>
            <div className="field"><label htmlFor="cm">Verification method</label><select id="cm" value={draft.component.method} onChange={(e) => setC('method', e.target.value)}>{Object.entries(COMPONENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="cl">Checkpoint location description (organisers only)</label><input id="cl" value={draft.component.location} onChange={(e) => setC('location', e.target.value)} /></div>
          <label className="check"><input type="checkbox" checked={draft.component.requiredForProgression} onChange={(e) => setC('requiredForProgression', e.target.checked)} /> Component recovery required for progression</label>
          {draft.component.method === 'qr' && <p className="muted small">QR token generation and revocation happen on the server (opaque tokens). Not built yet. {MOCK_DATA && `Demo token: ${draft.component.token}`}</p>}

          <div className="row"><Button type="button" onClick={save}>Save question {i}</Button><Button type="button" variant="ghost" onClick={() => setPreview(!preview)}>{preview ? 'Hide preview' : 'Preview as a team'}</Button></div>
          {preview && (
            <div className="qpanel" aria-label="Preview">
              <p><span className="tag tag--demo">Preview — not published</span></p>
              <QuestionBody q={{ ...draft, index: i }} />
              <AnswerForm question={{ ...draft, options: draft.optionsText.split('\n').filter(Boolean) }} onSubmit={async () => {}} disabled />
              <HintPanel hint={{ status: 'unlocked', text: draft.hint.text }} settings={settings} />
            </div>)}
        </div>)}
    </>
  )
}
