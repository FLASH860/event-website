// One login per team at a time. The SERVER enforces it (team_sessions table + claim_team_session);
// the frontend only claims, heartbeats and reacts. See docs/BACKEND_HANDOVER.md.
export const SESSION = {
  heartbeatMs: 15000, // how often the browser tells the server "this team session is still alive"
  // The server owns the real lease length (suggested 90 s). The mock provider uses its own short one for demos.
}

export const SESSION_MESSAGES = {
  team_session_active:
    'This team is already logged in on another device. Only one member can be logged in per team at a time. Ask the member who is logged in to log out, wait about a minute after they close the app, or ask an organiser to reset your session.',
  displaced: 'You were signed out because this team logged in on another device.',
  expired: 'Your session expired. Please log in again.',
  revoked: 'An organiser ended this team’s session. Please log in again.',
  not_a_team: 'This account is not linked to a team. Contact the organisers.',
  network: 'Could not reach the server to confirm your team session. Please try again.',
}
