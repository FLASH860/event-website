// Team-side data layer. Every decision (answer correctness, unlocking, hint release, attempts, the mission window) is made by
// the database; the browser only displays results. Contracts live in supabase/schema.sql.
import { rpc } from './api'

// -> { settings, questions[], currentIndex, solvedCount, complete }. Locked questions arrive as { index, status:'locked' } ONLY.
export const getMissionState = () => rpc('get_mission_state')

// -> { result: 'correct'|'incorrect'|'already_solved'|'attempts_exhausted'|'locked'|'too_fast', state? }
export const submitAnswer = (index, answer) => rpc('submit_answer', { p_question: index, p_answer: answer })

// -> [{ questionIndex, submittedAt, answer, result, by }]
export const listMySubmissions = () => rpc('list_my_submissions')



// -> { status: 'none'|'idle'|'running'|'stopped'|'finished', durationMs, remainingMs, serverNow }. Set / started / stopped by organisers.
export const getMyTimer = () => rpc('get_my_timer')

// -> { completed, completedAt } for the signed-in player. complete_briefing is idempotent.
export const getBriefingStatus = () => rpc('get_briefing_status')
export const completeBriefing = () => rpc('complete_briefing')
