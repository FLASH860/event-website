// Pure game logic for the four interactive puzzles (no React, no DOM), so it can be tested on its own.
// Note: these puzzles run in the browser, so what they reveal is only a convenience for the players. The real answer is still
// checked by the database (submit_answer): a word shown here is useless without typing it into the answer box.

// ---- shared
export function shuffled(n) {
  // Fisher-Yates, then again until no piece is already in its right place
  let a
  do {
    a = [...Array(n).keys()]
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  } while (a.some((v, i) => v === i))
  return a
}

// ---- Q2: power line (pipes)
export const N = 8
export const SIDES = ['N', 'E', 'S', 'W']
export const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] }
export const OPP = { N: 'S', E: 'W', S: 'N', W: 'E' }
export const MAX_STRAIGHT = 2   // the route never runs more than this many straight pieces in a row

// A small seeded random generator, so the same seed always gives the same board (the solved preview shows the board a team sees).
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A proper shuffle (Fisher-Yates) that uses the given random generator. Sorting with a random comparator is NOT repeatable across
// browsers or runs, which would give the same seed different boards.
export function shuffleWith(list, rnd) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// A random winding route from the top-left cell to the bottom-right cell, 24 to 40 pipes long, never crossing itself,
// and never more than MAX_STRAIGHT straight pieces in a row (so it keeps turning).
export function randomPath(rnd = Math.random) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const seen = new Set(['0,0']), path = [[0, 0]]
    let budget = 8000
    const go = (r, c, last, run) => {   // last = the direction we moved to get here, run = straight pieces in a row so far
      if (budget-- <= 0 || path.length > 40) return false
      if (r === N - 1 && c === N - 1) {   // leave through the robot's east side
        const straight = last === 'E'
        return path.length >= 24 && (straight ? run + 1 : 0) <= MAX_STRAIGHT
      }
      for (const s of shuffleWith(SIDES, rnd)) {
        const nr = r + DELTA[s][0], nc = c + DELTA[s][1], k = nr + ',' + nc
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || seen.has(k)) continue
        const next = s === last ? run + 1 : 0
        if (next > MAX_STRAIGHT) continue
        seen.add(k); path.push([nr, nc])
        if (go(nr, nc, s, next)) return true
        seen.delete(k); path.pop()
      }
      return false
    }
    if (go(0, 0, 'E', 0)) return path   // power comes in from the west, so the first piece is entered moving east
  }
  return Array.from({ length: 2 * N - 1 }, (_, i) => [Math.ceil(i / 2), Math.floor(i / 2)])   // a plain staircase, only if no route is found
}

// Open sides of a piece: straight = opposite sides, corner = neighbouring sides; rot turns it clockwise.
export const opens = (t) => (t.type === 'S' ? [SIDES[t.rot % 2], SIDES[(t.rot % 2) + 2]] : [SIDES[t.rot % 4], SIDES[(t.rot + 1) % 4]])

export function pipeFlow(g) {
  const seen = new Set()
  const walk = (r, c, from) => {
    if (r < 0 || r >= N || c < 0 || c >= N || seen.has(r * N + c)) return
    const o = opens(g[r][c])
    if (!o.includes(from)) return
    seen.add(r * N + c)
    o.filter((s) => s !== from).forEach((s) => walk(r + DELTA[s][0], c + DELTA[s][1], OPP[s]))
  }
  walk(0, 0, 'W')   // power comes in from the left of the top-left pipe
  return { seen, won: seen.has(N * N - 1) && opens(g[N - 1][N - 1]).includes('E') }
}

// Walks every way power could travel from the top-left to the bottom-right, going only by which pieces are straight (S) or corner (C).
// Returns how many complete routes there are (stops counting at `cap`) and which cells power could wander into along the way.
// A board is only fair if there is exactly 1 route. The wandered-into cells that are NOT on the route are the "false leads".
export function routeScan(types, cap = 2) {
  let count = 0
  const seen = new Set(), visited = new Set()
  const walk = (r, c, entry) => {
    if (count >= cap || r < 0 || r >= N || c < 0 || c >= N || seen.has(r * N + c)) return
    const exits = types[r][c] === 'S' ? [OPP[entry]] : (entry === 'N' || entry === 'S' ? ['E', 'W'] : ['N', 'S'])
    seen.add(r * N + c); visited.add(r * N + c)
    for (const ex of exits) {
      if (r === N - 1 && c === N - 1) { if (ex === 'E') count++; continue }
      walk(r + DELTA[ex][0], c + DELTA[ex][1], OPP[ex])
    }
    seen.delete(r * N + c)
  }
  walk(0, 0, 'W')
  return { count, visited }
}
export const countRoutes = (types, cap = 2) => routeScan(types, cap).count

// The sides a piece on the route must open: the side power comes from, and the side it leaves by.
export function routeSides(path, i) {
  const [r, c] = path[i]
  const from = i === 0 ? 'W' : SIDES.find((s) => path[i - 1][0] === r + DELTA[s][0] && path[i - 1][1] === c + DELTA[s][1])
  const to = i === path.length - 1 ? 'E' : SIDES.find((s) => path[i + 1][0] === r + DELTA[s][0] && path[i + 1][1] === c + DELTA[s][1])
  return [from, to]
}
export const fitsRoute = (tile, from, to) => { const o = opens(tile); return o.includes(from) && o.includes(to) }

const CANDIDATES = 8   // how many fair decoy layouts to compare; the one with the most false leads is used

// The board for a seed (the same seed always gives the same board). Exactly one route works, it keeps turning, NO piece on it starts
// turned the right way, and the decoys are chosen to look as promising as possible (the most dead-end branches).
export function newPipes(seed = Math.floor(Math.random() * 4294967296)) {
  const rnd = mulberry32(seed)
  for (;;) {
    const path = randomPath(rnd)
    const on = new Set(path.map(([r, c]) => r * N + c))
    const types = Array.from({ length: N }, () => Array(N).fill('S'))
    path.forEach(([r, c], i) => { const [from, to] = routeSides(path, i); types[r][c] = OPP[from] === to ? 'S' : 'C' })
    let best = null, found = 0
    for (let tries = 0; tries < 400 && found < CANDIDATES; tries++) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!on.has(r * N + c)) types[r][c] = rnd() < 0.5 ? 'S' : 'C'
      const { count, visited } = routeScan(types)
      if (count !== 1) continue
      found++
      const leads = [...visited].filter((k) => !on.has(k)).length
      if (!best || leads > best.leads) best = { leads, types: types.map((row) => [...row]) }
    }
    if (!best) continue
    const g = best.types.map((row) => row.map((type) => ({ type, rot: Math.floor(rnd() * 4) })))
    path.forEach(([r, c], i) => {   // every piece on the route starts turned the WRONG way
      const [from, to] = routeSides(path, i)
      while (fitsRoute(g[r][c], from, to)) g[r][c].rot = Math.floor(rnd() * 4)
    })
    return { g, path, leads: best.leads }
  }
}

export const turnPipe = (g, r, c) => g.map((row, i) => row.map((t, j) => (i === r && j === c ? { ...t, rot: (t.rot + 1) % 4 } : t)))

// The finished board: every piece on the route turned the right way. Only used by the dev preview, to show the answer.
export function solveBoard({ g, path }) {
  let cur = g
  path.forEach(([r, c], i) => {
    const [from, to] = routeSides(path, i)
    for (let k = 0; k < 4 && !fitsRoute(cur[r][c], from, to); k++) cur = turnPipe(cur, r, c)
  })
  return cur
}

// ---- Q3: reboot sequence (simon)
export const LET = ['R', 'G', 'B', 'Y']          // red, green, blue, yellow
export const ROUND_LENGTHS = [5, 6, 7, 8, 9, 10]
// Every round gets its own fresh sequence (not the last one with a colour added). Never three of the same colour in a row.
export function newSequences() {
  return ROUND_LENGTHS.map((n) => {
    const seq = []
    while (seq.length < n) {
      const p = Math.floor(Math.random() * 4)
      if (seq.length >= 2 && seq[seq.length - 1] === p && seq[seq.length - 2] === p) continue
      seq.push(p)
    }
    return seq
  })
}
export const typedMatches = (text, seq) => String(text).toUpperCase().replace(/[^RGBY]/g, '') === seq.map((p) => LET[p]).join('')

// ---- Q4: defuse
// Rules refer to the words solved in Q1-Q3: BEACON, SERVO, TORQUE.
export const DF_CUT = [3, 4]                    // vowels in the Q1 word = 3; letters in the Q2 word minus 1 = 4
export const DF_PRESS = ['T', 'O', 'R', 'Q']    // the order those letters first appear in the Q3 word
export const DF_DIAL = [6, 3, 4]                // letters in the Q1 word; where R sits in the Q2 word; where Q sits in the Q3 word
export const DF_SW = [0, 1, 0, 0, 1, 0]         // the letter O sits at 5, 5 and 2: switches 2 and 5 on

// ---- Q4 finale: snake
export const SNAKE_SIZE = 16
export const SNAKE_GOAL = 10
export function snakeInit() {
  const s = { body: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], food: [0, 0], score: 0 }
  s.food = snakeFood(s.body)
  return s
}
export function snakeFood(body, rnd = Math.random) {
  let f
  do { f = [Math.floor(rnd() * SNAKE_SIZE), Math.floor(rnd() * SNAKE_SIZE)] } while (body.some((c) => c[0] === f[0] && c[1] === f[1]))
  return f
}
// One tick. `want` is the direction the player asked for; turning straight back into yourself is ignored.
// Returns the next state plus what happened: 'move' | 'eat' | 'win' | 'crash'.
export function snakeStep(s, want, rnd = Math.random) {
  const dir = want && !(want[0] === -s.dir[0] && want[1] === -s.dir[1]) ? want : s.dir
  const h = [s.body[0][0] + dir[0], s.body[0][1] + dir[1]]
  if (h[0] < 0 || h[0] >= SNAKE_SIZE || h[1] < 0 || h[1] >= SNAKE_SIZE) return { s, event: 'crash' }
  const eats = h[0] === s.food[0] && h[1] === s.food[1]
  const body = [h, ...s.body]
  if (!eats) body.pop()
  if (body.slice(1).some((c) => c[0] === h[0] && c[1] === h[1])) return { s, event: 'crash' }   // checked after the tail moves, so chasing your own tail is fine
  if (!eats) return { s: { ...s, body, dir }, event: 'move' }
  const score = s.score + 1
  if (score >= SNAKE_GOAL) return { s: { ...s, body, dir, score }, event: 'win' }
  return { s: { ...s, body, dir, score, food: snakeFood(body, rnd) }, event: 'eat' }
}
