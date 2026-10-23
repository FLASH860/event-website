import { useState } from 'react'
import { HINT_REVEAL, PROGRESSION_MODES, COMPONENT_METHODS } from '../../config/mission'
import { Status } from '../ui'

// Progress strip: solved = "Solved", current = "Current", locked = "Locked". Text carries the meaning, not colour.
export function QuestionProgress({ questions, selected, onSelect, total = 4 }) {
  const slots = Array.from({ length: total }, (_, i) => questions?.find((q) => q.index === i + 1) || { index: i + 1, status: 'locked' })
  return (
    <ol className="qprog" aria-label="Question progress">
      {slots.map((q) => {
        const label = q.status === 'solved' ? 'Solved' : q.status === 'available' ? 'Open' : 'Locked'
        const inner = (<><span className="mono qprog__n">Q{q.index}</span><span className="qprog__s">{q.status === 'solved' ? '✓ ' : ''}{label}</span></>)
        return (
          <li key={q.index} className={`qprog__item qprog__item--${q.status} ${selected === q.index ? 'is-sel' : ''}`}>
            {onSelect && q.status !== 'locked'
              ? <button type="button" onClick={() => onSelect(q.index)} aria-current={selected === q.index ? 'step' : undefined}>{inner}</button>
              : <div aria-disabled={q.status === 'locked' || undefined}>{inner}</div>}
          </li>
        )
      })}
    </ol>
  )
}

export function HintPanel({ hint, settings, compact }) {
  const rule = HINT_REVEAL[settings?.hintReveal]
  return (
    <section className={`hint ${compact ? 'hint--compact' : ''}`} aria-label="Location intelligence">
      <p className="mono hint__label">Location intelligence</p>
      {hint?.status === 'unlocked'
        ? <p className="hint__text">{hint.text}</p>
        : <p className="muted">Locked. {rule ? rule.text : 'It will appear when the organisers’ rules allow.'}</p>}
    </section>
  )
}

// Four distinct states, never merged: solved, hint unlocked, component recovered, next question unlocked.
export function ComponentChecklist({ q, last }) {
  const rows = [
    ['Question solved', q.status === 'solved'],
    ['Hint unlocked', q.hint?.status === 'unlocked'],
    ['Component recovered', q.component?.status === 'recovered'],
    ...(last ? [] : [['Next question unlocked', q.nextUnlocked]]),
  ]
  return (
    <section className="checklist" aria-label="Question status">
      <p className="mono muted">Status</p>
      <ul className="plain">{rows.map(([t, ok]) => <li key={t}><span>{t}</span><Status tone={ok ? 'ok' : 'neutral'}>{ok ? 'Done' : 'Pending'}</Status></li>)}</ul>
      {q.component && <p className="muted small">Recovery: {COMPONENT_METHODS[q.component.method] || 'Method to be announced'}. {q.component.status === 'recovered' ? `Verified${q.component.via ? ` (${q.component.via === 'qr' ? 'QR scan' : 'organiser'})` : ''}.` : 'Shown as recovered only after the server verifies it.'}</p>}
    </section>
  )
}

export function ProgressionRule({ settings }) {
  const m = PROGRESSION_MODES[settings?.progressionMode]
  return m ? <p className="muted small"><strong>How questions unlock:</strong> {m.text}</p> : null
}

// Text answer or multiple choice. The server decides correctness; this only collects the answer.
export function AnswerForm({ question, onSubmit, onEmpty, onEdit, busy, disabled, describedBy }) {
  const [v, setV] = useState('')
  const submit = async (e) => {
    e.preventDefault(); if (disabled || busy) return
    if (!v.trim()) { onEmpty?.(); return } // nothing is sent to the server
    await onSubmit(v); setV('')
  }
  const edit = (x) => { setV(x); onEdit?.() }
  return (
    <form className="answerform" onSubmit={submit} noValidate>
      {question.type === 'choice'
        ? <fieldset aria-describedby={describedBy}><legend>Your answer</legend>{question.options.map((o) => (
            <label key={o} className="choice"><input type="radio" name="ans" value={o} checked={v === o} onChange={() => edit(o)} disabled={disabled} /> {o}</label>))}</fieldset>
        : <div className="field"><label htmlFor="answer">Your answer</label><input id="answer" value={v} onChange={(e) => edit(e.target.value)} autoComplete="off" disabled={disabled} aria-describedby={describedBy} /></div>}
      <button className="btn btn--primary" type="submit" disabled={busy || disabled}>{busy ? 'Verifying…' : 'Submit answer'}</button>
    </form>
  )
}

// A line written as [[img:/path.png|Label]] shows that picture with a download link; every other line is plain text.
function Body({ text }) {
  const parts = String(text || '').split(/^\[\[img:(.+?)\|(.+?)\]\]$/m)
  const out = []
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i].trim()) out.push(<p key={`t${i}`} className="qhead__body">{parts[i].trim()}</p>)
    if (parts[i + 1]) out.push(
      <figure key={`f${i}`} className="qfig">
        <a href={parts[i + 1]} target="_blank" rel="noopener noreferrer"><img src={parts[i + 1]} alt={parts[i + 2]} /></a>
        <figcaption><a className="link" href={parts[i + 1]} download>{parts[i + 2]} (download)</a></figcaption>
      </figure>)
  }
  return out
}

export function QuestionBody({ q, total = 4 }) {
  return (
    <header className="qhead">
      <p className="mono kicker">Question {q.index} of {total}</p>
      <h2 className="qhead__title">{q.title}</h2>
      <Body text={q.body} />
      {q.attachments?.length > 0 && <ul className="plain">{q.attachments.map((a) => <li key={a.url}><a className="link" href={a.url} target="_blank" rel="noopener noreferrer">{a.name}</a></li>)}</ul>}
    </header>
  )
}
