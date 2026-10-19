// DEV ONLY demo accounts for the mock provider. These are NOT real credentials and are not secure.
// This file is loaded with a dynamic import behind `import.meta.env.DEV`, so it is excluded from production builds.
export const DEV_ACCOUNTS = [
  { label: 'Team Alpha', email: 'team.alpha@demo.local', password: 'demo-alpha-123', role: 'team', team: { name: 'Team Alpha', code: 'RAS-001' } },
  { label: 'Team Bravo', email: 'team.bravo@demo.local', password: 'demo-bravo-123', role: 'team', team: { name: 'Team Bravo', code: 'RAS-002' } },
  { label: 'Event head', email: 'admin@demo.local', password: 'demo-admin-123', role: 'admin' },
]
