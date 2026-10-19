import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isBackendConfigured = Boolean(url && anonKey)
// Only the public anon key is ever used in the browser. Authorisation is enforced by RLS in Postgres.
export const supabase = isBackendConfigured ? createClient(url, anonKey) : null

export class NotConnectedError extends Error {
  constructor() {
    super('The backend is not connected yet. Nothing was sent or saved.')
    this.name = 'NotConnectedError'
  }
}
