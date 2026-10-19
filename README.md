# RAS: Mission Impossible — web app (foundation phase)

React + Vite + React Router. Plain CSS with design tokens. Supabase-ready auth layer.

## Run locally
```bash
npm install
cp .env.example .env     # optional for now
npm run dev              # http://localhost:5173
npm run build            # production build (tested)
```
Host the build with an SPA fallback (all paths -> index.html).

## What works now
- Public: landing page, full rules page, external-registration page, team/admin login, forgot-password.
- Role-aware routing, protected routes, session loading states, logout.
- Distinct participant layout (top nav) and event-head layout (sidebar).
- Fluid layout via clamp()/grid; reduced-motion support; status shown as text + shape.

## What is NOT connected (clearly labelled in the UI)
- Registration saving, login, password reset: need Supabase (below). Without it the UI says "backend not connected" and nothing is faked.
- All team/admin pages (challenge, QR scan, submissions, announcements, teams, rounds, checkpoints, results) are placeholders.
- No QR scanning, scoring, progression or realtime exists yet.

## Preview the layouts without a backend (dev only)
Set `VITE_DEV_PREVIEW=true` in `.env`, run `npm run dev`, open `/login` and use the preview buttons.
It is not authentication, is labelled with an amber banner, and is disabled in production builds.

## Connect Supabase
1. Create a project; run `supabase/schema.sql` in the SQL editor.
2. Put the project URL and **anon** key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never use the service-role key in the frontend.
3. Create team/admin users in Supabase Auth and add a row in `profiles` for each (role `team` or `admin`). Roles are read server-side and cannot be changed by users.

## Where things live
- `src/config/eventConfig.js` — all event facts (date, venue, fee, prize pool, rounds, registration open/closed).
- `src/content/rules.js` — complete rules, rendered by `/rules`.
- `src/auth/` — AuthContext, ProtectedRoute, dev preview. `src/lib/` — supabase client, registration API.
- `src/components/` — UI primitives and the three layouts. `src/pages/` — routes. `src/styles/` — tokens + CSS.

## Decisions to confirm
1. **Event facts:** the latest brief says Classroom 103, Engineering Block, ₹515 and no prize. This overrides your earlier edit (Classroom 104, B-Tech Block, ₹500, ₹5,000 prize). To restore it, change `venue`, `fee`, `feeAmount`, `prizePool` in `src/config/eventConfig.js`.
2. **Public contact** (Modhak Kushalappa) is omitted; set `publicContact` if organisers approve publishing it.
3. **Registration deadline** and whether registration is open: `registrationDeadline`, `registrationOpen`.
4. **Account creation:** this build assumes organisers approve a registration then issue the team's login. Confirm or switch to self-signup + approval.
5. **Round 2 rules and qualification cutoffs** are shown as "to be announced" (not in the source rules).
6. Source rules had inconsistent round numbering; the canonical five-round order and 900-point split are used everywhere.

## Next phases
Team data + dashboard, challenge content model, server-validated QR checkpoints (opaque tokens, Edge Function), submissions + review, scoring/qualification, announcements, audit log.

---
# Mission immersion, messages & timers (added phase)

## Status of each feature
**Functional now (frontend, no backend needed)**
- Message system: `src/config/messages.js` (content) + `src/lib/messageEngine.js` (selection, no-repeat, priority, success-needs-confirmation) + `MessageProvider` (one non-blocking message at a time, dismissible).
- Self-destruct briefing: skippable (button or Esc), reduced-motion skips it, plays once per device, configurable in `src/config/immersion.js`, never touches data. Real elapsed-time count, not a stored decrement.
- Timer component and logic: states, tabular numerals, configurable warning thresholds (only those shorter than the round), warnings announced to screen readers only on change. Remaining time is always recomputed from the deadline, with a server clock-offset correction.
- QR feedback component with the 8 distinct outcomes; success refuses to render unless `confirmed`.
- Event schedule (event-wide) shown separately from round timers (per team).

**Demonstration data (labelled DEMO in the UI, only shown with no backend or in dev preview)**
- Demo timer on the Challenge page (sessionStorage; persists on refresh to show deadline-based timing; not trusted).
- Demo scan outcomes, demo cinematic moments, replay briefing (Team dashboard / Scan / Challenge pages).

**Needs backend integration**
- Real timers: `get_round_timer` RPC + `round_timers` table are in `supabase/schema.sql`; admin start/pause/resume/extend and server-side submission deadline checks are NOT written yet.
- Checkpoint verification: `verify_checkpoint` RPC contract is documented, not implemented. The camera opens, but QR decoding is intentionally not wired until the server can verify.
- "First login" is per device (localStorage) until the backend can record it. Clue release, stage unlock, qualification and completion messages are wired in the engine but need real server events to trigger them.
- Round start modes (`central`, `checkpoint`, `authorised`) in `src/config/timing.js` only change wording; the backend must enforce them. Durations are NOT set: organisers configure them server-side.

## Message wording
The seven film-reference lines are used as you supplied them and are marked `verified: false` in `messages.js`. Verify exact wording before publishing. Film references display "not an official IEEE RAS ECC statement". Easter eggs ("jumping out a window", "Why Jim?") only appear rarely after confirmed success moments (`IMMERSION.easterEggs`), never on errors. `impossible` ("mission impossible" line) is defined but disabled.

---
# Landing page, Start Playing gate & external registration (latest phase)

## Where to configure (all in `src/config/eventConfig.js`)
- `REGISTRATION_URL` — `null` until you supply the official link. While null, Register buttons show a disabled "Official link coming soon" state. When set, they open it in a new tab with `rel="noopener noreferrer"`. Nothing is registered inside this site.
- `GAMEPLAY` — `enabled`, `timeZone` (`Asia/Kolkata`), `startsAt`, `endsAt`, `confirmed`, `override`. The window is **provisional** (it mirrors the event time, `confirmed: false`) and the locked dialog says so until you set `confirmed: true`. Override modes: `open` (optional `until`), `closed`, `extend` (`until`).

## Start Playing behaviour
- Before the window: dialog "Oops! Your mission hasn’t started yet, Agent!" with the opening date/time in Asia/Kolkata and a live countdown. Dismiss with the button, Esc, or the backdrop.
- During: button becomes "Enter the mission" (marked live) and goes to `/login`, or to the team dashboard if already signed in.
- After: "Mission window closed, Agent." Override/extension is respected. `enabled: false` and "not announced" states also have their own copy.
- The team area shows a locked screen outside the window (`GameplayGuard`). Dev preview bypasses it.

## Security status (read this)
- **Frontend gating is only a courtesy.** With no backend, the gate uses the visitor’s device clock and the dialog says "Prototype note". That is NOT secure access control.
- With Supabase: `get_gameplay_status()` supplies the window and the server clock (the frontend corrects for a wrong device clock); `assert_gameplay_open()` is the real enforcement and **must be called at the top of every gameplay function** (timers, checkpoint verification, submissions). All are in `supabase/schema.sql`, not yet applied or tested against a live database.
- Demonstration controls (footer "preview Start Playing states") change only what the page displays.

## Added shells
`/team/progress`, `/admin/audit`, and an organiser team table with search and stage/status filters (`/admin/teams`). The table shows no data until `listTeams()` has a backend view (`team_overview`); status labels are text, and "next action" is a simple label mapping, not workflow logic.

## Unchanged from before
Quotes, self-destruct briefing, timers and QR feedback components (see the previous section). The `‘Difficult’ should be a walk in the park for you.` line now uses your latest wording.

---
# Demo logins, one login per team, backend handover (latest phase)

**Run:** `npm install && npm run dev` (`.env.development` turns on dev mock auth). Open `/login`: a clearly labelled demo-accounts table appears:

| Account | Email | Password |
|---|---|---|
| Team Alpha (RAS-001) | team.alpha@demo.local | demo-alpha-123 |
| Team Bravo (RAS-002) | team.bravo@demo.local | demo-bravo-123 |
| Event head | admin@demo.local | demo-admin-123 |

These are **fake dev accounts in a mock provider, not real credentials and not secure.** They are excluded from production builds (verified: none of these strings appear in `dist`). Real team and organiser accounts are created by the backend owner.

**One login per team:** the frontend claims a session on login, heartbeats every 15 s, releases on logout, and signs the user out with a message if displaced. The SERVER must enforce it; the SQL and contracts are in `supabase/schema.sql` and `docs/BACKEND_HANDOVER.md`. Test in dev: log in as Team Alpha, open a second tab, try Team Alpha again; it is refused while the first tab is active.

**For your friend:** `grep -rn "TODO(BACKEND)" src supabase` lists every integration point; start with `docs/BACKEND_HANDOVER.md`.

---
# Four-question mission system (latest phase)

**Try it:** `npm run dev`, log in as Team Alpha, open **Question**. Demo data is clearly labelled: the questions are obvious placeholders (type `DEMO1` for Q1, `DEMO2`... for the rest); QR tokens are `DEMO-Q1`... (enter them under Scan > Demonstration tools). In a second window log in as the event head: **Questions** sets the progression rule and hint reveal; **Teams > Manage** approves recovery, releases hints, resets progress; **Audit** shows what you did.

**Functional (against the dev mock):** sequential questions with locked content withheld from the browser, text and multiple-choice answers, attempts, hint panel ("Location intelligence"), four separate status states (solved / hint unlocked / component recovered / next unlocked), the three configurable progression modes, two hint-reveal modes, QR recovery, organiser approval, per-team isolated persistent progress (survives refresh), submissions history, question editor with preview, audit trail. The progression logic was tested for all modes, idempotent resubmits, replay blocking and that no accepted answers or locked content appear in team payloads.
**Prototype:** everything above runs on `mockBackend.js` in your browser. It is not secure and is stripped from production builds.
**Needs the backend:** the real thing. SQL is drafted in `supabase/schema.sql` (not run), contracts in `docs/BACKEND_HANDOVER.md`. Admin RPCs are listed, not written. Question timers, scoring/penalties, file attachments upload, announcements, and the link between the four questions and the five official rounds are not built.
**Organiser must decide:** progression mode, hint reveal, attempts/penalties, timers, the real questions/answers/hints/locations, QR token generation, and the question-to-round relationship.
