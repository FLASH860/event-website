import { Link } from 'react-router-dom'
export default function Wordmark({ to = '/' }) {
  return (
    <Link to={to} className="wordmark" aria-label="RAS: Mission Impossible — home">
      <span className="wordmark__pre">RAS:</span> Mission Impossible
    </Link>
  )
}
