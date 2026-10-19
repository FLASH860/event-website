import { isBackendConfigured } from '../../lib/supabase'
import { supabaseProvider } from './supabaseProvider'
import { nullProvider } from './nullProvider'

// Picks the auth implementation. The mock is behind `import.meta.env.DEV`, so production builds can never include it.
export async function loadProvider() {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true') {
    return (await import('./mockProvider.js')).mockProvider
  }
  return isBackendConfigured ? supabaseProvider : nullProvider
}
