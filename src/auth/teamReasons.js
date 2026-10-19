import { EVENT } from '../config/eventConfig'

// Plain-language text for the reasons create_team / join_team can refuse.
export const TEAM_REASONS = {
  name_taken: 'That team name is already taken. Choose another.',
  invalid_name: 'Names must be 1 to 40 characters (team names 2 to 40).',
  invalid_code: 'No team has that code. Check the 6 digits with your teammate.',
  team_full: `That team is already full (${EVENT.teamMax} members).`,
  too_many: 'Too many wrong codes. Wait about 10 minutes and try again.',
  already_in_team: 'You are already in a team.',
  not_allowed: 'This account cannot join a team.',
}
