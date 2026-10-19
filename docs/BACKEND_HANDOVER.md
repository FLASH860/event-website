# Backend handover (for whoever owns database + auth)

The frontend is finished up to the backend boundary. Every place that needs you is tagged **`TODO(BACKEND)`**:

```bash
grep -rn "TODO(BACKEND)" src supabase
```

The frontend never trusts itself. Anything marked "UX only" in the code must ALSO be enforced in the database.

## 0. Run the frontend without the backend
`npm install && npm run dev` uses `.env.development` (`VITE_DEV_MOCK_AUTH=true`), which switches on an in-browser MOCK
auth with demo accounts (shown on /login). It is dev-only and stripped from production builds.

To switch to the real backend: put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and set
`VITE_DEV_MOCK_AUTH=false` there. **Never** put the service-role key in any `VITE_` variable.

## 1. Auth model
- **One shared account per TEAM** (not per member). Organisers create the account and a `profiles` row
  (`role = 'team'`, `team_id`), or `role = 'admin'`.
- The role is read from `profiles` (RLS: users can read their own row, never write it).
- The only file that talks to Supabase auth: `src/auth/providers/supabaseProvider.js`. Keep the returned shapes.

## 2. One login per team (required)
Rule: a team can have only ONE live session at a time. A second device is refused until the first logs out, is
reset by an organiser, or stops heartbeating for the lease time (suggested 90 s).

Frontend flow (`src/auth/AuthContext.jsx`): sign in -> `claim_team_session` -> store `session_id` -> heartbeat every
15 s (`src/config/session.js`) -> `release_team_session` on logout. If a heartbeat says `valid:false`, the user is
signed out with a message.

| RPC | Params | Returns | Notes |
|---|---|---|---|
| `claim_team_session` | `p_device text` | `{ok:true, session_id}` or `{ok:false, reason:'team_session_active'\|'not_a_team'}` | Atomic. Succeeds only if no row or the row is stale. |
| `heartbeat_team_session` | `p_session_id uuid` | `{valid:true}` or `{valid:false, reason:'displaced'\|'expired'\|'revoked'}` | Refreshes `last_seen`. |
| `release_team_session` | `p_session_id uuid` | void | Called on logout. |
| `admin_reset_team_session` | `p_team_id uuid` | void | Organiser unlock. Wire a button in `/admin/teams`. |

**Don't skip this:** the blocked device still has a valid JWT. Every gameplay RPC must also check the caller owns the
live session (`assert_active_team_session(p_session_id)` is provided) or the rule can be bypassed by calling the API directly.
That means gameplay RPCs need a `p_session_id` parameter; the frontend already stores it (`ras_team_session_id`) and can pass it.

## 3. Gameplay window (server-enforced)
Tables/functions in `supabase/schema.sql`: `gameplay_settings`, `gameplay_state()`, `get_gameplay_status()`,
`assert_gameplay_open()`. Call `assert_gameplay_open()` at the top of every gameplay RPC. The window in the SQL
seed is PROVISIONAL (event hours); confirm it with the organisers and set `confirmed = true`.

## 4. Other contracts the frontend already calls
| Frontend file | Backend thing | Shape |
|---|---|---|
| `src/lib/timerApi.js` | RPC `get_round_timer(p_round)` | `{status, started_at, deadline_at, duration_ms, paused_remaining_ms, server_now}` |
| `src/lib/checkpointApi.js` | RPC `verify_checkpoint(p_token)` | `{result:'valid'\|'invalid'\|'already_processed'\|'wrong_stage'\|'not_authorised'}` (NOT written yet) |
| `src/lib/teamsApi.js` | view `team_overview` | `id, team_name, team_code, college, stage, status` (NOT written yet) |
| `src/lib/gameplayApi.js` | RPC `get_gameplay_status()` | `{enabled, starts_at, ends_at, override_mode, override_until, confirmed, state, server_now}` |

Not built anywhere yet (frontend shows placeholders): timer start/pause/resume/extend (admin), submissions,
scoring, qualification, announcements, audit log, checkpoint token generation, registration approval.
Registration itself is external (a form link set in `src/config/eventConfig.js`).

## 5. Test checklist
1. Team logs in on device A -> OK. Same team on device B -> refused with `team_session_active`.
2. A logs out -> B can log in. A closes the tab without logging out -> B can log in after the lease.
3. A is displaced/reset by an admin -> A is signed out within ~15 s with a clear message.
4. Call a gameplay RPC with a stale/foreign `session_id` -> rejected.
5. Outside the gameplay window every gameplay RPC fails; the landing page shows the locked/closed dialog.
6. A team can never read another team's rows (RLS), and a team user cannot read `profiles` of others or write `role`.
7. `grep -r "service_role" dist` returns nothing.

## 6. Mission system: four questions, hints, component recovery (NEW)
Frontend: `src/lib/missionApi.js` (all calls + contracts), `src/components/mission/`, `src/pages/team/Challenge.jsx`, `src/pages/admin/Questions.jsx`, `src/pages/admin/Teams.jsx`.
Reference behaviour: **`src/lib/mock/mockBackend.js` is an executable spec**; it mirrors every rule and return shape below.

Rules the server MUST enforce:
1. Q1 is open to every eligible team. Q(n+1) unlocks according to `mission_settings.progression_mode`:
   `answer` (correct answer), `recovery` (component recovery verified; questions without a required component fall back to a correct answer), `answer_and_approval` (correct answer AND an organiser-approved recovery).
2. **Never send locked content.** Locked questions return only `{index, status:'locked'}`. Hints are returned only when released (`hint_reveal`: on correct answer, or organiser release). Accepted answers and QR tokens never leave the server.
3. `submit_answer` is atomic and idempotent (advisory lock + ON CONFLICT): repeats cannot unlock twice. It also enforces the gameplay window, one-live-session, attempts, and (TODO) the question deadline.
4. Component recovery is its own state, separate from "solved". QR tokens are opaque and stored hashed; replay returns `already_processed`.
5. Every admin action writes `audit_log`. Admin RPC list is at the end of `schema.sql`.

Open organiser decisions the frontend does NOT assume: progression mode, hint-reveal mode, per-question attempts/penalties, timers, and how the four questions relate to the five official rounds (`questions.round_id` is optional and unset).

Extra test checklist: a team cannot fetch Q2 content before unlocking (inspect the network payload); Team A progress never changes Team B; resubmitting a correct answer or replaying a QR changes nothing; changing the progression mode takes effect immediately; a team user calling any `admin_*` RPC is rejected.

## 7. Rounds, scoring, qualification, announcements (NEW)
Frontend: `src/pages/admin/AdminPages.jsx` (Rounds, Results, Announcements), `src/pages/team/TeamPlaceholders.jsx` (Progress, Announcements). Contracts are in `src/lib/missionApi.js`; `mockBackend.js` is the executable spec.
Rules the server MUST enforce:
1. Round names, order and max points (100/150/200/150/300 = 900) are immutable data; only status and an optional duration are editable.
2. `admin_save_score` rejects values outside 0..max. Totals are display only; **no function may set a qualification decision automatically**.
3. Qualification slots, cutoff and tie-breaker are nullable organiser inputs (default NULL = "pending organiser confirmation"). Tie-breaker options are possibilities, not rules.
4. Teams read scores and decisions only through `get_my_progress`, and only when `published = true`, only their own rows (RLS).
5. Every call above writes `audit_log`. Admin RPCs check `is_admin()`. Retracting an announcement is audited.
Not yet in `schema.sql`: tables and RPCs for these (rounds_config, scores, qualification, announcements).

## 8. Team Name login (NEW)
Participants sign in with **Team name + password**. Organisers still sign in with email. The browser must never see or send a team's internal email.
Frontend: `src/pages/Login.jsx`, `AuthContext.signIn(identifier, password, audience)`, `providers/*.signInTeam`.
Server (Supabase Edge Function `team-login`, uses the service-role key **on the server only**):
1. Input `{ team_name, password }`. Normalise with `lower(btrim(name))` and look up `teams` (unique index in `schema.sql`; reject duplicate names at registration/import).
2. Resolve that team's internal auth email from `profiles`, call `signInWithPassword` server-side, and return `{ access_token, refresh_token }` only.
3. On ANY failure return the same generic error (never reveal whether the team exists). Rate-limit per IP and per team name and lock out after repeated failures.
4. The frontend then calls `supabase.auth.setSession`, re-reads the role from `profiles`, and claims the single team session as before. A team name alone grants nothing.
Organiser login on `/login/admin` is a separate path; a role/audience mismatch signs straight back out. "Forgot password" is not offered to teams (they do not know their email): organisers reset team passwords.

## 9. Mission briefing (NEW)
Frontend: `src/components/briefing/*`, wording in `src/config/briefing.js`, wired in `src/pages/team/TeamDashboard.jsx`.
Persistence: table `team_briefing` + RPCs `get_briefing_status()` and `complete_briefing()` (bottom of `supabase/schema.sql`). Both take NO team parameter; the server derives the team from `current_team_id()`, so a team can only read or write its own record. There is no insert/update RLS policy; `complete_briefing` is idempotent and keeps the first completion time.
Policy: shown automatically at login until the team uses the final "Accept mission" action. "Leave briefing" (or Esc) records nothing, so it is offered again at the next login. Replay never calls `complete_briefing`. If the backend cannot be reached, the briefing is NOT forced (completion could not be recorded); replay still works.
The briefing never starts a timer, unlocks a question, releases a hint or changes progress. Dev mock stores completion in the mock DB only (not secure persistence).

## 10. Team area structure (Phase 1 redesign, theme-neutral)
- `TeamLayout` owns identity (name + ID from the authenticated session), navigation (Mission / Question / Scan + "More"), mission polling and the briefing (`hooks/useBriefing.jsx`), so every team route is covered.
- `pages/team/TeamDashboard.jsx` = mission home. `components/mission/MissionHome.jsx` derives "Your next step" ONLY from `get_mission_state` output (no invented steps). No new backend calls were added except the existing `list_announcements` preview.
- Slide 3 of the briefing and the "How questions unlock" line read the configured `progressionMode` / `hintReveal` from `get_mission_state().settings`.
- Visual styling for this structure is concentrated in the "Team header identity", "Mission home" blocks at the end of `src/styles/global.css` and `src/styles/briefing.css`, so the Phase 2 theme can replace it without touching logic.

## 11. Phase 2 team area, and OPEN DATA-MODEL QUESTIONS
Structure: one mission screen (`TeamDashboard` = stage line + `QuestionPanel` beside `MissionLog` + compact score/qualification), `Overview`, `Announcements`; Scan/Submissions/Rules/Replay under "More". `/team/challenge` redirects to `/team` (keeps `?q=`); `/team/progress` redirects to `/team/overview`.
Confirmed workflow used: the four questions are Stage 1 (Digital Transmission); a correct answer unlocks the next question immediately (`progression_mode = 'answer'`, the default).
Gaps the backend/organisers must resolve (NOT faked in the UI):
1. **Components are modelled per question** (`components`, `component_recoveries` keyed by question idx, `verify_checkpoint` returns `questionIndex`). The brief says Head / Body-Core / Arms / Legs belong to Stage 3, independent of the four questions. A separate `stage3_components(team_id, part, recovered_at, via)` model and a checkpoint verifier that targets a PART are needed. Until then Overview shows "Tracking not connected" and the dashboard no longer shows per-question component status.
2. **Per-question location hints** still exist in the schema; the UI shows one only if the server has released it. Confirm whether Stage 1 questions should reveal hints at all.
3. **Official stage status** has no team-readable source (the mock `rounds` are organiser-only). Add a `get_my_stage_status` RPC if teams should see which stage is live.
4. **Scan** currently only opens the camera; QR decoding is not implemented (`verifyCheckpoint` is the integration point).
5. Announcement "unread" is tracked per device in localStorage (presentation only).
6. No robot photography was supplied: `src/config/imagery.js` is an empty slot used only on the landing hero and first briefing slide.

## 12. Answer feedback and mission sequence
Wording: `FEEDBACK` and `SEQUENCE` in `src/config/mission.js`. Rendering: `AnswerFeedback.jsx` (incorrect / empty / verifying / error) and `MissionSequence.jsx` (success and the final field handoff). Question numbers are generated, never hardcoded.
- Validation is unchanged: the server decides. Success is shown only after the server accepts. The correct answer is never revealed. Empty submissions are caught locally and sent nowhere.
- Correct, Q1..Q3: one consolidated region (verified -> objective complete -> proceed). "Next objective available" appears only if the server state says the next question is unlocked (`nextUnlocked`).
- Correct, Q4 (and any revisit of a solved Q4): Digital Transmission complete -> field deployment -> the hint exactly as released (`hint.text`) plus the component code only if `component.id` is non-empty. If the hint is not released the UI says so; nothing is invented. No Question 5 action and no qualification claim exist.
- The old cinematic toasts on answer events (stage-unlock, completion) were removed from this flow to avoid duplicate success messages.
- "Acknowledge intelligence" is presentation only and is not persisted. If organisers want it recorded, add an RPC.
- Q4's hint must be configured by organisers (`question_hints`, idx 4) and released under the active `hint_reveal` rule, otherwise teams see the "not yet released" state.
