# RAS: Mission Impossible

Two separate apps in one repo, one Supabase database behind both.

| App | What it is | Run | URL |
|---|---|---|---|
| **Team site** (`/src`) | Landing page, rules, sign-up, team create/join, the four-question mission, QR scanner | `npm run dev` | http://localhost:5173 |
| **Admin console** (`/admin`) | Organiser console: live team monitor, questions, QR codes, announcements, scores, settings, audit | `npm run admin` | http://127.0.0.1:5174 |

The admin console binds to `127.0.0.1`, has its own build, and is **never deployed**: only you can open it, on your machine.
Deploy only the team site (`npm run build`, serve `dist/` with an SPA fallback so every path serves `index.html`).

## Setup (once)

1. `npm install`
2. Create a Supabase project. In **Project Settings → API** copy the Project URL and the **anon/publishable** key into `.env.local` (see `.env.example`). Never put the `service_role` key anywhere in this repo.
3. Supabase **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. Safe to run again.
4. **Authentication → Providers → Email**: for the event, turn **off** "Confirm email" (otherwise every player needs a working inbox, and the free tier only sends a few emails per hour).
   Also turn **on** *Allow anonymous sign-ins* (Authentication → Sign In / Providers): teammates log in with just the team code and their name, which uses an anonymous session. Then raise the limit under **Authentication → Rate Limits → anonymous users** (default 30 per hour per IP; everyone on the venue Wi-Fi shares an IP, so set it to a few hundred).
5. Create your organiser account: **Authentication → Users → Add user** (email + password, tick *Auto Confirm User*). Then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOU@example.com');
   ```
6. `npm run admin`, log in, then **Questions** (enter the four questions and answers), **Checkpoints** (generate and print QR codes), **Settings** (mission window).

Roles can only be changed in the SQL editor. A player cannot make themselves an admin.

## How a game works

1. One person per team opens **Create account** (`/signup`): team name, their name, email, password. The team gets a 6-digit code, shown on the dashboard. Teammates use **Log in** (`/login`) with only that code and their own name. Teams hold up to 4 members and share one progress. Logging in again with the same name takes over that member's seat (new phone, cleared browser) without adding a fifth member.
2. When the mission window is open, the team sees Question 1. A correct answer unlocks the next question (rule set in Admin → Settings: answer only / QR recovery / answer + organiser approval).
3. A hint (location) appears when the question is solved, or when an organiser releases it. The team scans the QR at that spot to recover the component.

## Why teams cannot read the answers

- **No table is readable from a browser.** Every table has Row Level Security on, no policies, and no grants for `anon`/`authenticated`. The browser only calls database functions.
- **Answers are stored as salted SHA-256 hashes** (`question_secrets`). Nothing, including the admin console, can read them back; the database only compares a submitted answer to the hashes and returns *correct* / *incorrect*.
- **Locked questions are never sent.** `get_mission_state()` returns only `{index, status:'locked'}` for a question the team has not unlocked. Hints and locations are returned only once earned.
- `submit_answer` is atomic, idempotent, rate-limited (one attempt per 2 s per team and question) and checks the mission window on the server.
- QR tokens are random 128-bit values; only their hash is stored. Generating a new one kills the old one.
- Every `admin_*` function re-checks `is_admin()`; a player calling them directly gets `forbidden`.

`npm run test:db` runs `supabase/schema.sql` in an in-memory Postgres and attacks it (83 checks: direct table reads, self-promotion to admin, skipping questions, guessing answers/join codes, calling admin functions as a player, closed window, QR replay, ...).

## Layout

```
src/            team site (React + Vite + React Router, plain CSS tokens)
  auth/         sign-up, login, session (authApi.js is the only file that talks to Supabase Auth)
  lib/          api.js (rpc helper), missionApi.js, gameplayApi.js
admin/          organiser console (separate Vite app; reuses the team site's styles and UI primitives)
supabase/
  schema.sql    the whole database: tables, RLS, functions, permissions
  tests/        schema.test.mjs (npm run test:db)
```

Event facts (date, venue, fee, rounds) live in `src/config/eventConfig.js`; rules text in `src/content/rules.js`. Everything else (questions, answers, hints, mission window, announcements, scores) is data in the database, edited from the admin console.

## Notes

- Realtime is polling (team mission every 20 s, announcements every 45 s, admin pages every 5-15 s). That is plenty for an event of this size and needs no extra Supabase configuration.
- "Register" (Google Form + fee) is separate from game accounts: the form registers the team for the event, `/signup` creates the accounts used to play.
- The mission window is seeded as **force open** so you can test now. Before the event: Admin → Settings → **Follow the schedule** (and check the opening/closing times).
