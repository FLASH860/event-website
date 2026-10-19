import { supabase, isBackendConfigured, NotConnectedError } from './supabase'

// Every server call goes through here. The browser never reads tables; it calls database functions, and the database
// decides everything (see supabase/schema.sql). Errors carry a short `code` the UI can switch on.
export async function rpc(name, args = {}) {
  if (!isBackendConfigured) throw new NotConnectedError()
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const e = new Error(error.message)
    e.code = /gameplay_closed/.test(error.message) ? 'closed'
      : /no_team/.test(error.message) ? 'no_team'
      : /not_authenticated|JWT/i.test(error.message) ? 'auth'
      : 'network'
    throw e
  }
  return data
}
