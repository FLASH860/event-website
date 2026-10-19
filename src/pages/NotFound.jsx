import { Button } from '../components/ui'
export default function NotFound() {
  return (
    <div className="container block narrow">
      <p className="mono kicker">404</p>
      <h1 className="h1">Off the map</h1>
      <p className="lede">That page does not exist.</p>
      <Button to="/">Back to overview</Button>
    </div>
  )
}
