// Mission briefing wording. Edit text HERE; the presentation component never needs to change.
import { PROGRESSION_MODES } from './mission'
// Rules: no questions, answers, hidden locations, penalties, time limits or qualification numbers appear in this file.
// `lines` are the display headline, one entry per line (lines enter from alternating sides).
const stage1Rule = (st) => (!st?.progressionMode || st.progressionMode === 'answer')
  ? 'Submit the correct answer and the next question unlocks immediately.'
  : (PROGRESSION_MODES[st.progressionMode]?.text ?? 'How the next question unlocks is set by the organisers.')

export const briefingSlides = ({ teamName, event, settings }) => [
  {
    id: 'identification', label: 'Classified mission briefing', kicker: 'Incoming transmission',
    lines: ['Welcome,', `${(teamName || 'Agent').toUpperCase()}.`],
    tagline: 'Your mission begins now.',
    body: ['Your team has been assigned an operation requiring logic, precision, teamwork, and control.'],
  },
  {
    id: 'objective', label: 'Mission objective', kicker: 'Objective',
    lines: ['Your objective', 'is simple.', 'Completion is not.'],
    tagline: 'Think → Decode → Solve',
    body: ['Four questions stand between your team and the mission. Each correct answer opens the next one.'],
    points: ['Four questions, answered in order.', 'Question 1 is open from the start.', 'Solve one to unlock the next.', 'Answers are checked by the server.'],
  },
  {
    id: 'operation', label: 'The four questions', kicker: 'How it works',
    lines: ['Every answer', 'opens a new door.'],
    points: [
      'The mission is a sequence of four online questions.',
      'You begin with Question 1.',
      stage1Rule(settings),
      'Every answer is checked by the server, never in your browser.',
    ],
  },
  {
    id: 'field', label: 'Field operations', kicker: 'Field rules',
    lines: ['Stay sharp.', 'Stay on mission.'],
    points: ['Follow approved campus routes and checkpoints.', 'Collect only designated mission items.', 'Do not enter restricted areas.', 'Do not interfere with other teams or their clues.', 'Handle organiser-provided equipment safely.', 'Report malfunctions and safety concerns immediately.'],
  },
  {
    id: 'engagement', label: 'Rules of engagement', kicker: 'Conduct',
    lines: ['Discipline is', 'part of the mission.'],
    points: ['Unauthorised assistance is prohibited.', 'Never share answers, codes, or clues with competing teams.', 'Follow organiser and volunteer instructions.', 'Use the announced submission procedures.', 'Finish challenges within the announced time limits.', 'Qualification depends on criteria the organisers announce.', 'Penalties, tie-breakers, and scoring follow the official event instructions.'],
    link: { href: '/rules', text: 'Read the full official rules' },
  },
  {
    id: 'accept', label: 'Accept the mission', kicker: 'Final briefing',
    lines: ['Your team.', 'Your mission.'],
    body: ['Every decision counts. Work together, follow the clues, and complete the operation.'],
    facts: [['Date', event.dateLabel], ['Time', event.time], ['Venue', event.venue]],
  },
]
