// Mission message definitions. Content only: no React, no display logic.
// Fields: id, text, trigger, round?, durationMs?, enabled?, priority?, kind, maxPerSession?
//   kind: 'film'   = reference to the film franchise, shown with an "unofficial reference" note
//         'system' = plain mission-system wording
//         'easter' = rare optional easter egg (success moments only)
//   verified: false = wording supplied by the organisers, not independently verified. Check before publishing.
// These are creative references. They are NOT statements from IEEE RAS ECC.
export const MESSAGES = [
  { id: 'assign', text: 'Your mission, should you choose to accept it...', trigger: 'first-login', kind: 'film', verified: false, priority: 5, durationMs: 6000 },
  { id: 'received', text: 'Transmission received.', trigger: 'clue-released', kind: 'system', priority: 3 },
  { id: 'received-ann', text: 'Transmission received.', trigger: 'announcement', kind: 'system', priority: 2 },
  { id: 'start-walk', text: '‘Difficult’ should be a walk in the park for you.', trigger: 'challenge-start', kind: 'film', verified: false, priority: 2 },
  { id: 'start-clock', text: 'Clock’s ticking, agent.', trigger: 'challenge-start', kind: 'system', priority: 1 },
  { id: 'params', text: 'Mission parameters updated.', trigger: 'round-config-updated', kind: 'system', priority: 2 },
  { id: 'warn', text: 'Clock’s ticking, agent.', trigger: 'countdown-warning', kind: 'system', priority: 3, durationMs: 3500, maxPerSession: 3 },
  { id: 'cp-ok', text: 'Checkpoint verified.', trigger: 'checkpoint-verified', kind: 'system', priority: 5 },
  { id: 'unlock', text: 'Access granted.', trigger: 'stage-unlock', kind: 'system', priority: 5 },
  { id: 'qualified', text: 'Access granted.', trigger: 'qualified', kind: 'system', priority: 5 },
  { id: 'final-entry', text: 'I am the storm.', trigger: 'final-entry', round: 5, kind: 'film', verified: false, priority: 6, durationMs: 6000 },
  { id: 'final-done', text: 'What’s done is done when I say it’s done.', trigger: 'final-entry', round: 5, kind: 'film', verified: false, priority: 4, durationMs: 6000 },
  { id: 'answer-ok', text: 'Answer accepted.', trigger: 'answer-accepted', kind: 'system', priority: 4 },
  { id: 'done', text: 'Mission accomplished.', trigger: 'completion', kind: 'system', priority: 6, durationMs: 6000 },
  { id: 'impossible', text: 'Well, this is not mission difficult, Mr. Hunt, it’s mission impossible.', trigger: 'briefing-intro', kind: 'film', verified: false, priority: 1, enabled: false },
  // Optional easter eggs: rare, success moments only.
  { id: 'egg-window', text: 'I’m jumping out a window!', trigger: 'easter-egg', kind: 'easter', verified: false, priority: 1 },
  { id: 'egg-jim', text: 'Why Jim? Why? The world still needs you...', trigger: 'easter-egg', kind: 'easter', verified: false, priority: 1 },
]

// Success-style triggers: ignored unless the caller passes `confirmed: true` (i.e. the backend confirmed it).
export const SERVER_CONFIRMED_TRIGGERS = new Set(['answer-accepted', 'hint-revealed', 'checkpoint-verified', 'stage-unlock', 'qualified', 'completion', 'final-entry', 'clue-released'])
// Triggers after which an easter egg may (rarely) appear.
export const EASTER_EGG_AFTER = new Set(['answer-accepted', 'hint-revealed', 'checkpoint-verified', 'completion'])
