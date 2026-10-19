// Small presentational pieces for the briefing. No data, no persistence.
export function BriefingProgress({ index, total }) {
  return (
    <ol className="bf__progress" role="progressbar" aria-label="Briefing progress" aria-valuemin="1" aria-valuemax={total} aria-valuenow={index + 1} aria-valuetext={`Slide ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => <li key={i} className={i <= index ? 'is-on' : ''} />)}
    </ol>
  )
}

export function BriefingNavigation({ index, total, onPrev, onNext, onFinish, finishLabel, busy, error }) {
  const last = index === total - 1
  return (
    <div className="bf__nav">
      {error && <p className="bf__error" role="alert">{error}</p>}
      <div className="bf__navrow">
        <button type="button" className="btn btn--ghost bf__prev" onClick={onPrev} disabled={index === 0} aria-hidden={index === 0 || undefined} tabIndex={index === 0 ? -1 : 0}>Previous</button>
        {last
          ? <button type="button" className="btn btn--primary bf__accept" onClick={onFinish} disabled={busy}>{busy ? 'Saving…' : finishLabel}</button>
          : <button type="button" className="btn btn--primary" onClick={onNext}>Next</button>}
      </div>
    </div>
  )
}
