// Single source of truth for event facts. Edit here; nothing is hardcoded in components.
export const EVENT = {
  name: 'RAS: Mission Impossible',
  host: 'IEEE RAS ECC',
  hostFull: 'IEEE Robotics and Automation Society · PES University Electronic City Campus',
  dateLabel: 'Saturday, 24 October 2026',
  dateShort: '24 Oct 2026',
  time: '8:30 AM – 11:30 AM',
  venue: 'Classroom 103, Engineering Block',
  type: 'Inter-college competition',
  teamSize: '3–4 members',
  teamMin: 3,
  teamMax: 4,
  fee: '₹515 per team',
  feeAmount: 515,
  prizePool: null, // no prize amount has been confirmed; set a string (e.g. '₹5,000') to show it everywhere
  // Organisers decide whether registration is open. Set false to show a closed notice.
  registrationOpen: true,
  registrationDeadline: null, // e.g. '20 October 2026' once announced
  publicContact: null, // e.g. { name: 'Name', phone: '...' } only if organisers approve publishing
  maxPoints: 900,
  // Official event-wide schedule (same for every team). Round timers are separate and per team.
  schedule: { startsAt: '2026-10-24T08:30:00+05:30', endsAt: '2026-10-24T11:30:00+05:30' },
}

export const ROUNDS = [
  { n: 1, id: 'digital-transmission', name: 'Digital Transmission', points: 100, blurb: 'Decode secret messages and solve digital or logical puzzles.' },
  { n: 2, id: 'robotics-logic', name: 'Robotics & Logic Challenge', points: 150, blurb: 'Answer robotics-related questions and technical reasoning problems.' },
  { n: 3, id: 'find-your-robo', name: 'Find Your Robo', points: 200, blurb: 'Follow clues and recover designated mission items at approved campus checkpoints.' },
  { n: 4, id: 'robo-rescue', name: 'Hardware Mission: Robo Rescue', points: 150, blurb: 'Operate a provided robot through an obstacle course to complete a mission.' },
  { n: 5, id: 'final-mission', name: 'Final Mission', points: 300, blurb: 'Solve the final puzzle and complete the Robo-Core activation challenge.' },
]

// Registration is handled OUTSIDE this site. Paste the official link here; never invent one.
// While null, the Register buttons show a "link coming soon" state instead of a fake link.
export const REGISTRATION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfaEUwUO1z5DV6OyF1Oe3Jofy68plMMaC1FpjGCTJkWaF6uAA/viewform' // official Google Form

// Gameplay access window. This is NOT assumed to equal the event schedule: the values below mirror the event time
// as a PROVISIONAL placeholder (confirmed: false). Set `confirmed: true` once organisers confirm the real window.
// In production the SERVER is the source of truth (see supabase/schema.sql: gameplay_settings, get_gameplay_status,
// assert_gameplay_open). This object is only the prototype fallback used when no backend is connected.
export const GAMEPLAY = {
  enabled: true,                       // master switch
  timeZone: 'Asia/Kolkata',
  startsAt: '2026-10-24T08:30:00+05:30',
  endsAt: '2026-10-24T11:30:00+05:30',
  confirmed: false,
  // Organiser override (prototype). null | { mode: 'open', until?: ISO } | { mode: 'closed' } | { mode: 'extend', until: ISO }
  override: { mode: 'open' }, // TEMPORARY: window ignored so you can log in now. Set back to null to restore the schedule.
}
