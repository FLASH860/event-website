# RAS: Mission Impossible

Two separate apps in one repo, one Supabase database behind both.

| App | What it is | Run | URL |
|---|---|---|---|
| **Team site** (`/src`) | Landing page, rules, create account / log in, the four missions | `npm run dev` | http://localhost:5173 |
| **Control** (`/admin`) | Organiser console, three tabs: **Teams**, **Leaderboard**, **Timer** | `npm run admin` | http://127.0.0.1:5174 |

Control binds to `127.0.0.1`, has its own build, and is **never deployed**: only you can open it, on your machine.
Deploy only the team site (`npm run build`, serve `dist/` with an SPA fallback so every path serves `index.html`).

## Setup (once)

1. `npm install`
2. Create a Supabase project. In **Project Settings → API** copy the Project URL and the **anon/publishable** key into `.env.local` (see `.env.example`). Never put the `service_role` key anywhere in this repo.
3. Supabase **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. Safe to run again, and it upgrades an older copy of this schema.
4. **Authentication → Providers → Email**: turn **off** "Confirm email". Also turn **on** *Allow anonymous sign-ins* (Authentication → Sign In / Providers): teammates log in with just the team code and their name, which uses an anonymous session. Then raise **Authentication → Rate Limits → anonymous users** to a few hundred per hour (the default of 30 per IP is shared by everyone on the venue Wi-Fi).
5. Make your organiser account: **Authentication → Users → Add user** (email + password, tick *Auto Confirm User*), then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOU@example.com');
   ```
6. `npm run admin` and log in.

Roles can only be changed in the SQL editor. A player cannot make themselves an admin.

## How a game works

1. One person per team opens **Create account**: team name, their name, email, password. The team gets a 6-digit code, shown on the dashboard. Teammates use **Log in** with only that code and their own name. A team holds up to 4 people and shares one progress. Logging in again with the same name takes over that member's seat (new phone, cleared browser) without adding a fifth.
2. Mission 1 is open. A correct answer unlocks the next mission and shows its hint straight away. Clicking a locked mission says to solve the previous one.
3. In Control: **Teams** lists every team and its members, **Leaderboard** ranks them (missions solved, then who finished their latest mission first), **Timer** adds minutes to, starts and stops each team's clock (or every team at once). Teams see their own countdown on the dashboard. The timer is display only: it does not block answers.

## Writing the questions

Missions 2-4 start empty (Mission 1 ships as a sample: answer `MISSION`). Write each one in the Supabase SQL editor; answers are hashed as they go in and can never be read back:

```sql
select public.set_question(
  1,                                   -- mission number 1-4
  'Title',
  'The question text',
  array['accepted answer', 'another accepted answer'],
  'Hint shown as soon as it is solved'
);
```
Optional extras: `p_active`, `p_type` (`'text'` or `'choice'`) with `p_options` (`'["A","B"]'::jsonb`), `p_attempts`, `p_case_sensitive`. This function cannot be called from a browser.

## Other things you may need from the SQL editor

```sql
-- Close / open / follow-the-schedule for the mission window (a team outside it cannot read or answer questions)
update public.gameplay_settings set override_mode = 'closed';   -- or 'open', or null to follow starts_at / ends_at
-- Wipe all teams and progress (e.g. after testing). Players keep their accounts but lose their team.
delete from public.teams;
```
The window is seeded as **force open** so you can test. Before the event set `override_mode = null` and check `starts_at` / `ends_at`.

## Why teams cannot read the answers

- **No table is readable from a browser.** Every table has Row Level Security on, no policies, and no grants for `anon`/`authenticated`. The browser only calls database functions.
- **Answers are stored as salted SHA-256 hashes** (`question_secrets`). Nothing can read them back; the database only compares a submitted answer to the hashes and returns *correct* / *incorrect*.
- **Locked missions are never sent.** `get_mission_state()` returns only `{index, status:'locked'}` for a mission the team has not unlocked. Hints are returned only once the mission is solved.
- `submit_answer` is atomic, idempotent, rate-limited (one attempt per 2 s per team and mission) and checks the mission window on the server.
- Every `admin_*` function re-checks `is_admin()`; a player calling them directly gets `forbidden`.

`npm run test:db` runs `supabase/schema.sql` in an in-memory Postgres and attacks it (direct table reads, self-promotion to admin, skipping missions, guessing answers and codes, calling organiser functions as a player, the mission window, timers, ...). Set `OLD_SCHEMA=path/to/older-schema.sql` to also test upgrading an older database.

## Layout

```
src/            team site (React + Vite + React Router, plain CSS tokens)
  auth/         create account, code login, session (authApi.js is the only file that talks to Supabase Auth)
  lib/          api.js (rpc helper), missionApi.js, gameplayApi.js
admin/          Control (separate Vite app; reuses the team site's styles and UI primitives)
supabase/
  schema.sql    the whole database: tables, RLS, functions, permissions
  tests/        schema.test.mjs (npm run test:db)
```

Event facts (date, venue, fee) live in `src/config/eventConfig.js`; rules text in `src/content/rules.js`.

## Notes

- Realtime is polling (team mission every 20 s, team strip and timer every 15 s, Control every 4-10 s). That is plenty for an event of this size and needs no extra Supabase configuration.
