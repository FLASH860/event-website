import { MESSAGES, SERVER_CONFIRMED_TRIGGERS, EASTER_EGG_AFTER } from '../config/messages'
import { IMMERSION } from '../config/immersion'

const KEY = 'ras_msg_seen' // presentation-only, per browser session
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') } catch { return {} } }
const write = (o) => { try { sessionStorage.setItem(KEY, JSON.stringify(o)) } catch { /* ignore */ } }

function choose(trigger, round, seen) {
  const pool = MESSAGES.filter((m) =>
    m.enabled !== false && m.trigger === trigger && (m.round == null || m.round === round) &&
    (m.maxPerSession == null || (seen[m.id] || 0) < m.maxPerSession))
  if (!pool.length) return null
  // Prefer the least-shown message; break ties by priority, then definition order.
  pool.sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0) || (b.priority ?? 0) - (a.priority ?? 0))
  return pool[0]
}

// Pure-ish selection: returns a message or null. Never returns success messages without confirmation.
export function pickMessage(trigger, { round = null, confirmed = false, force = false } = {}) {
  if (SERVER_CONFIRMED_TRIGGERS.has(trigger) && !confirmed) return null
  const seen = read()
  let msg = choose(trigger, round, seen)
  const eggs = IMMERSION.easterEggs
  if (!force && eggs.enabled && EASTER_EGG_AFTER.has(trigger) && confirmed && Math.random() < eggs.chance) {
    msg = choose('easter-egg', round, seen) || msg
  }
  if (!msg) return null
  seen[msg.id] = (seen[msg.id] || 0) + 1
  write(seen)
  return msg
}
