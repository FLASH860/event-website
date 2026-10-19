// DEV ONLY switch. The dynamic import sits behind `import.meta.env.DEV`, so production builds drop the mock entirely.
export const MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true'
export async function mockBackend() {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true') return await import('./mockBackend.js')
  return null
}
