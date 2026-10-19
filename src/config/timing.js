// Round timing CONFIGURATION (not authority). The server decides actual start, deadline and status.
// Nothing here invents a duration: organisers set durations in the backend. `durationMin` is only a hint
// for display before a server timer exists, and is null on purpose.
//
// startMode (wording only; the backend enforces it):
//   'central'    -> organisers start the round for everyone
//   'checkpoint' -> starts when a team reaches/validates a checkpoint
//   'authorised' -> starts when an organiser authorises that team
//   null         -> not specified yet
export const START_MODE_TEXT = {
  central: 'Starts when the organisers start this round.',
  checkpoint: 'Starts when your team’s checkpoint is verified.',
  authorised: 'Starts when an organiser authorises your team.',
  default: 'Starts when this round’s start event occurs.',
}

const base = { startMode: null, durationMin: null, warningsSec: [300, 60, 10] }
export const ROUND_TIMING = {
  1: { ...base }, 2: { ...base }, 3: { ...base }, 4: { ...base }, 5: { ...base },
}
export const timingFor = (n) => ROUND_TIMING[n] ?? base

// How often the client re-syncs with the server (ms). Display ticks locally; truth comes from the server.
export const RESYNC_MS = 30000
