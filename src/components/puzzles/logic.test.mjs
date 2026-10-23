import assert from 'node:assert/strict'
import * as L from './logic.js'

// Run: npm run test:puzzles
let pass = 0
const ok = (name, fn) => { try { fn(); pass++; console.log('PASS ', name) } catch (e) { console.log('FAIL ', name, '\n     ', e.message); process.exitCode = 1 } }

ok('shuffled never leaves a piece in place and is a permutation', () => {
  for (let i = 0; i < 200; i++) {
    const a = L.shuffled(16)
    assert.equal(a.length, 16); assert.deepEqual([...a].sort((x, y) => x - y), [...Array(16).keys()]); assert.ok(a.every((v, k) => v !== k))
  }
})

ok('pipes: 300 boards, path 24-40 long, from top-left to bottom-right, never starts solved, always solvable', () => {
  for (let n = 0; n < 300; n++) {
    const { g, path } = L.newPipes()
    assert.ok(path.length >= 24 && path.length <= 40, 'length ' + path.length)
    assert.deepEqual(path[0], [0, 0]); assert.deepEqual(path[path.length - 1], [L.N - 1, L.N - 1])
    assert.equal(new Set(path.map((p) => p.join())).size, path.length, 'path crosses itself')
    assert.equal(L.pipeFlow(g).won, false, 'started solved')
    // turn the route's pieces to the orientation that joins their neighbours: must win
    let cur = g
    path.forEach(([r, c], i) => {
      const from = i === 0 ? 'W' : L.SIDES.find((s) => path[i - 1][0] === r + L.DELTA[s][0] && path[i - 1][1] === c + L.DELTA[s][1])
      const to = i === path.length - 1 ? 'E' : L.SIDES.find((s) => path[i + 1][0] === r + L.DELTA[s][0] && path[i + 1][1] === c + L.DELTA[s][1])
      for (let k = 0; k < 4 && !(L.opens(cur[r][c]).includes(from) && L.opens(cur[r][c]).includes(to)); k++) cur = L.turnPipe(cur, r, c)
    })
    assert.equal(L.pipeFlow(cur).won, true, 'could not be solved')
  }
})

ok('pipes: every board has exactly ONE working route, and it is the intended one (no shortcuts)', () => {
  for (let n = 0; n < 200; n++) {
    const { g, path } = L.newPipes()
    const types = g.map((row) => row.map((t) => t.type))
    assert.equal(L.countRoutes(types), 1, 'more than one route')
    // the intended route is a real route
    const on = new Set(path.map(([r, c]) => r * L.N + c)); assert.equal(on.size, path.length)
  }
  // sanity check of the counter itself: an all-straight board has no route to the corner, a hand-made two-route board has 2
  const plain = Array.from({ length: L.N }, () => Array(L.N).fill('S')); assert.equal(L.countRoutes(plain), 0)
  let most = 0   // among plain random boards the counter must find boards with more than one route (that is what the generator avoids)
  for (let i = 0; i < 400; i++) most = Math.max(most, L.countRoutes(Array.from({ length: L.N }, () => Array.from({ length: L.N }, () => (Math.random() < 0.5 ? 'S' : 'C'))), 5))
  assert.ok(most >= 2, 'counter never saw a second route, most = ' + most)
})

ok('pipes: solveBoard shows the finished board (power reaches the robot)', () => {
  for (let n = 0; n < 50; n++) { const b = L.newPipes(); assert.equal(L.pipeFlow(b.g).won, false); assert.equal(L.pipeFlow(L.solveBoard(b)).won, true) }
})

ok('pipes: the same seed always gives the same board, and the route never runs more than 2 straight pieces in a row', () => {
  for (let n = 1; n <= 60; n++) {
    const a = L.newPipes(n * 104729), b = L.newPipes(n * 104729)
    assert.equal(JSON.stringify(a), JSON.stringify(b), 'not repeatable')
    const types = a.g.map((row) => row.map((t) => t.type)); let run = 0
    a.path.forEach(([r, c]) => { if (types[r][c] === 'S') { run++; assert.ok(run <= L.MAX_STRAIGHT, 'straight run of ' + run) } else run = 0 })
  }
  assert.notEqual(JSON.stringify(L.newPipes(1)), JSON.stringify(L.newPipes(2)), 'different seeds should differ')
})

ok('pipes: no piece on the route starts in its solved position, and the board is not already solved', () => {
  for (let n = 1; n <= 80; n++) {
    const b = L.newPipes(n * 15485863)
    b.path.forEach(([r, c], i) => { const [from, to] = L.routeSides(b.path, i); assert.equal(L.fitsRoute(b.g[r][c], from, to), false, `piece ${i} of board ${n} starts solved`) })
    assert.equal(L.pipeFlow(b.g).won, false)
    assert.equal(L.pipeFlow(L.solveBoard(b)).won, true)
  }
})

ok('pipes: decoys give plenty of false leads (dead-end branches) and still only one real route', () => {
  let total = 0
  for (let n = 1; n <= 40; n++) { const b = L.newPipes(n * 32452843); total += b.leads; assert.equal(L.countRoutes(b.g.map((row) => row.map((t) => t.type))), 1); assert.ok(b.leads >= 15, 'only ' + b.leads + ' false-lead cells') }
  assert.ok(total / 40 >= 25, 'average false leads ' + total / 40)
})

ok('pipes: a board is fixed by its seed, in every browser (guards the bug where the same seed gave different boards)', () => {
  const hash = (seed) => [...JSON.stringify(L.newPipes(seed))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  // these values were checked identical in Node and in Edge; if they change, boards would differ between old and new page loads
  assert.equal(hash(2538527472), 397510046); assert.equal(hash(4000000000), 1724856429); assert.equal(hash(99), 803479321)
  for (const seed of [2538527472, 3000000000, 4294967295, 1]) assert.equal(hash(seed), hash(seed))
})

ok('pipes: turnPipe turns one piece a quarter turn and leaves the board unchanged otherwise', () => {
  const { g } = L.newPipes(), h = L.turnPipe(g, 2, 3)
  assert.equal(h[2][3].rot, (g[2][3].rot + 1) % 4); assert.equal(g[2][3].rot === h[2][3].rot, false)
  assert.equal(JSON.stringify(h.map((r, i) => r.filter((_, j) => !(i === 2 && j === 3)))), JSON.stringify(g.map((r, i) => r.filter((_, j) => !(i === 2 && j === 3)))))
})

ok('pipes: power only counts when it reaches the robot through the bottom-right pipe', () => {
  const g = Array.from({ length: L.N }, () => Array.from({ length: L.N }, () => ({ type: 'S', rot: 1 })))   // every pipe east-west
  const f = L.pipeFlow(g)
  assert.equal(f.seen.size, L.N); assert.equal(f.won, false)   // lights the top row only, never reaches the robot
})

ok('sequence: six rounds of 5-10, own sequence each, no triple repeats', () => {
  for (let n = 0; n < 100; n++) {
    const s = L.newSequences()
    assert.deepEqual(s.map((x) => x.length), [5, 6, 7, 8, 9, 10])
    s.forEach((x) => { assert.ok(x.every((p) => p >= 0 && p < 4)); for (let i = 2; i < x.length; i++) assert.ok(!(x[i] === x[i - 1] && x[i] === x[i - 2])) })
  }
  const a = L.newSequences(); assert.notDeepEqual(a[1].slice(0, 5), a[0], 'round 2 should not just extend round 1 (checked over many runs below)')
})
ok('sequence: round 2 is not round 1 plus one flash (over 200 runs, almost never)', () => {
  let same = 0
  for (let n = 0; n < 200; n++) { const s = L.newSequences(); if (s[1].slice(0, 5).join() === s[0].join()) same++ }
  assert.ok(same < 20, 'prefix matched ' + same + ' of 200')
})
ok('sequence: typed answers ignore case, spaces and other characters', () => {
  assert.ok(L.typedMatches('r g, b-y', [0, 1, 2, 3])); assert.ok(L.typedMatches('RGBY', [0, 1, 2, 3]))
  assert.ok(!L.typedMatches('RGBR', [0, 1, 2, 3])); assert.ok(!L.typedMatches('RGB', [0, 1, 2, 3])); assert.ok(!L.typedMatches('', [0, 1, 2, 3]))
})

ok('defuse: the module rules match the words BEACON, SERVO, TORQUE', () => {
  const W = ['BEACON', 'SERVO', 'TORQUE']
  assert.deepEqual(L.DF_CUT, [[...W[0]].filter((c) => 'AEIOU'.includes(c)).length, W[1].length - 1])
  assert.deepEqual(L.DF_PRESS, [...new Set(W[2])].slice(0, 4))
  assert.deepEqual(L.DF_DIAL, [W[0].length, W[1].indexOf('R') + 1, W[2].indexOf('Q') + 1])
  const on = [...new Set(W.map((w) => w.indexOf('O') + 1))]
  assert.deepEqual(L.DF_SW.map((v, i) => (on.includes(i + 1) ? 1 : 0)), L.DF_SW)
})

ok('snake: moves, eats, grows, wins at the goal', () => {
  let s = L.snakeInit(), ev
  assert.equal(s.body.length, 3)
  ;({ s, event: ev } = L.snakeStep(s, null)); assert.equal(ev, 'move'); assert.equal(s.body.length, 3); assert.deepEqual(s.body[0], [9, 8])
  s = { ...s, food: [10, 8] }
  ;({ s, event: ev } = L.snakeStep(s, null)); assert.equal(ev, 'eat'); assert.equal(s.score, 1); assert.equal(s.body.length, 4)
  assert.ok(!s.body.some((c) => c[0] === s.food[0] && c[1] === s.food[1]), 'food spawned on the snake')
  s = { ...s, score: L.SNAKE_GOAL - 1, food: [s.body[0][0] + 1, s.body[0][1]] }
  ;({ s, event: ev } = L.snakeStep(s, null)); assert.equal(ev, 'win'); assert.equal(s.score, L.SNAKE_GOAL)
})
ok('snake: walls and its own body crash it; turning straight back is ignored', () => {
  let s = { body: [[15, 5], [14, 5], [13, 5]], dir: [1, 0], food: [0, 0], score: 3 }
  assert.equal(L.snakeStep(s, null).event, 'crash')
  s = { body: [[5, 5], [4, 5], [3, 5]], dir: [1, 0], food: [0, 0], score: 0 }
  const r = L.snakeStep(s, [-1, 0]); assert.equal(r.event, 'move'); assert.deepEqual(r.s.body[0], [6, 5]); assert.deepEqual(r.s.dir, [1, 0])
  const loop = { body: [[5, 5], [4, 5], [4, 6], [5, 6], [6, 6], [6, 5]], dir: [1, 0], food: [0, 0], score: 0 }   // turning down runs into its own body
  assert.equal(L.snakeStep(loop, [0, 1]).event, 'crash')
  const tail = { body: [[5, 5], [5, 6], [4, 6], [4, 5]], dir: [0, -1], food: [0, 0], score: 0 }   // moving into the cell the tail is leaving is fine
  assert.equal(L.snakeStep(tail, [-1, 0]).event, 'move')
})

console.log(`\n${pass} passed`)
