import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

export const Button = forwardRef(function Button({ to, href, variant = 'primary', children, ...rest }, ref) {
  const cls = `btn btn--${variant}`
  if (to) return <Link ref={ref} className={cls} to={to} {...rest}>{children}</Link>
  if (href) return <a ref={ref} className={cls} href={href} {...rest}>{children}</a>
  return <button ref={ref} className={cls} {...rest}>{children}</button>
})

export function Field({ label, id, error, hint, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field__err" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  )
}

// Status is always text + shape, never colour alone.
export function Status({ tone = 'neutral', children }) {
  return <span className={`status status--${tone}`}><span className="status__mark" aria-hidden="true" />{children}</span>
}

export function Loading({ label = 'Loading…' }) {
  return <div className="state" role="status"><span className="mono">{label}</span></div>
}

export function Notice({ tone = 'info', title, children }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  )
}

export function SectionHead({ kicker, title, children, align }) {
  return (
    <header className={`sechead ${align === 'center' ? 'sechead--center' : ''}`}>
      {kicker && <p className="kicker mono">{kicker}</p>}
      <h2>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </header>
  )
}

export function Placeholder({ title, planned, spec }) {
  return (
    <div className="panel">
      <Status tone="warn">Not yet connected</Status>
      <h2 className="panel__title">{title}</h2>
      {spec && <p>{spec}</p>}
      <p className="muted">Planned for a later phase:</p>
      <ul className="plain">{planned.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  )
}
