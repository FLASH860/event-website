import { NotConnectedError } from '../../lib/supabase'
// Used when neither a backend nor dev mock auth is configured. Nothing works and nothing is faked.
const no = async () => { throw new NotConnectedError() }
export const nullProvider = {
  name: 'none',
  getInitialSession: async () => null,
  onSignedOut: () => () => {},
  signIn: no, signInTeam: no, resetPassword: no,
  signOut: async () => {},
  claimTeamSession: no, heartbeat: no, releaseTeamSession: async () => {},
}
