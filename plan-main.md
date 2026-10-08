# Aiplay: visible sign-in and permanent student dashboard

## Handoff and scope

Implementation status (current workspace): visible home-page account actions, 20-account registration limit, SQLite storage with legacy JSON import, database-backed sessions, demo dashboard, daily topic/chat/game summaries, saved chat answers, and completed-game recording have been added. They have **not been manually tested** at the user's request. The remaining items in this document are a roadmap, especially server-validated individual quiz answers, lesson-check completion, and durable storage configuration for hosted deployment. The free Render configuration still does not provide permanent storage across redeploys.

User requirements:

- Make Sign in and Create account clearly visible on desktop and mobile.
- Register real people using name, Gmail/email address and an Aiplay password. No Google Cloud, Google OAuth, verification email or OTP.
- Allow up to 20 real registered students in total; this is an account limit, not a simultaneous-session limit. Existing students can always sign in when capacity is reached.
- Put a clearly labeled demo option below the real sign-in/registration form.
- Store accounts and learning history in the backend, privately per person.
- Provide a permanent dashboard showing topics asked about, today's learning, chat history, question performance, games and rematches.
- Preserve the recent Fishing layout and question-paper upload changes, existing AI integration and three-game learning flow.
- User previously requested no agent-run tests: carry this preference forward. Supply manual verification steps; do not run automated/browser/live API tests without new authorization. Do not promise zero errors or claim unperformed verification.
- Do not deploy, purchase infrastructure, commit or push merely because this plan exists. Implement locally and report any hosting requirement separately.

## Existing code: verified issues to fix first

| Area | Observed issue | Required correction |
| --- | --- | --- |
| `server.js`, `currentUser()` | Cookie extraction uses `.slice(16)` although `aiplay_session=` has 15 characters. It drops the first character of the user ID. | Parse using the literal cookie-name length, not a magic number; replace the session scheme as described below. |
| `auth.js` and `index.html` | Sign-in markup is inserted into `.site-header nav` only after `/api/auth/me` returns; HTML has no permanent sign-in placeholder. | Render accessible account links in HTML immediately. Keep them visible on mobile and during API errors. |
| `auth.js` | User name is interpolated into `innerHTML`. | Build DOM nodes and assign untrusted names with `textContent`. |
| `auth.js` | Every session lookup failure becomes anonymous state. | Separate loading, signed out, signed in and service unavailable states. A failed request must not be presented as a confirmed logout. |
| `server.js` | Session signing fallback is derived from the source path; token has no server expiry/revocation; logout only clears the browser cookie. | Use random opaque database-backed sessions with expiry and server-side revocation. |
| `data-store.js` | One rejected queued write leaves the promise queue rejected, breaking later writes. All read/JSON errors become an empty database. | Replace with transactional storage. Never reset accounts because of corrupt data or permission errors. |
| `data-store.js` | Registration has no capacity limit. History is globally trimmed at 25,000 activities. | Atomically enforce 20 real users; remove silent history deletion. |
| `activity-tracker.js` | A `pagehide` request counts every visit as a three-question completed game, uses potentially stale scores and may be cancelled at navigation. | Save at actual answer/completion events, with stable IDs, retries and duplicate protection. |
| `server.js` | Lesson recording stores metadata only; chat stores only the first 500 characters of the question, without the answer. | Store complete supported conversation and lesson content, linked to authenticated owner. |
| `dashboard.html` | No daily learning, full history, completion state or reliable rematch metrics; request errors are unhandled. | Implement the dashboard contract below and explicit loading/error/empty states. |
| Hosting | `render.yaml` uses a free service and declares no persistent disk; JSON is under the application directory. | Do not claim durable hosted data with this configuration. Configure supported durable storage before production handoff. |

Inspect current files and any AGENTS.md instructions again before implementation; the worktree includes user changes. Preserve unrelated edits. Ignore secrets in `.env` and never print their values.

## Product flow and design

### Visible entry points

On the study home page, render a prominent violet **Sign in** button and secondary **Create account** link directly in HTML. Keep an account action outside any navigation that disappears on small screens. Load the shared account CSS on every page that uses it.

For signed-in users, show **Hi, {name}**, **My dashboard**, and **Sign out**. Add dashboard access to the assistant sidebar/mobile navigation and game completion panels. A direct dashboard visit should show a loading state, then data or a sign-in prompt; a network failure should offer Retry instead of redirecting immediately.

### Registration and sign-in

- Registration fields: name, email, new password. Sign-in fields: email and password. Use correct autocomplete attributes, labels, show/hide-password button and keyboard focus states.
- Explain briefly: "Use your email and create an Aiplay password." Never ask for the user's actual Gmail account password.
- Name is required, trimmed, 2–60 characters. Email is trimmed and lowercased; accept ordinary valid email addresses including Gmail. Do not rewrite Gmail dots or plus aliases without email verification.
- Password is 8–200 characters; do not trim or silently truncate it. Hash with a random salt and asynchronous scrypt. Preserve compatibility with existing stored scrypt parameters on migration.
- Disable duplicate submission while pending. Show field-specific errors, an accessible status message and a useful retry path.
- Registration signs the student in immediately and opens their dashboard. No email ownership verification is implied.
- At 20 accounts, registration displays "All 20 student places are currently filled. Existing students can still sign in." Enforce this on the server, even when the form remains open from earlier.
- Use a safe local return path when sign-in is required from a lesson/game. Reject absolute or protocol-relative redirect destinations.

### Demo below the form

Use **Try the demo dashboard** beneath a divider and a short "Preview with sample data" caption. Assumption: the user wants a preview, not a publicly shared account with a reusable password.

- Open `dashboard.html?demo=1` with explicitly labeled fixture data and a persistent Demo badge.
- Demo excludes private endpoints and real user data, creates no registered user, and consumes none of the 20 places.
- Demo must not overwrite an existing authenticated session or mix fixtures into personal records.
- Provide Create your account and Back to sign in actions. If demo supports any interaction, keep it local to the demo and label unsaved activity clearly.

### Visual direction

Retain Aiplay's warm off-white background, violet primary actions, rounded cards and existing DM Sans/Outfit typography. Auth should be a readable centered card with generous spacing. On desktop, dashboard uses a compact navigation column plus content; on mobile use a stacked layout and visible account/navigation controls. Use real empty states rather than fake student statistics.

## Durable backend and migration

For this existing single-process Node 24 app and 20-account scope, use SQLite through the supported Node runtime API, with prepared statements, foreign keys, transactions, migration versions and a busy timeout. Keep storage logic behind `data-store.js` or a dedicated repository module; no framework rewrite is needed. Confirm Node runtime support from the local project before choosing exact imports.

Configure an explicit `DATA_DIR` outside publicly served assets. Development may default to `./data`; production must point at genuinely persistent storage. SQLite requires a single application instance with its database on durable local storage. If the selected host cannot supply that, stop before claiming production persistence and describe the external database alternative and required configuration. Never silently fall back to an ephemeral database.

Migration requirements:

1. Back up `data/aiplay-data.json` without deleting or committing it. Ignore all database, WAL, SHM, backup and runtime files in Git and block them at the HTTP layer.
2. Import existing IDs, names, email addresses, salted hashes and supported activities transactionally. Mark completion with a migration version so restarts do not duplicate records.
3. Fail clearly on corrupt JSON, duplicate emails or incompatible schema. Do not replace damaged data with an empty store.
4. Preserve existing accounts if more than 20 already exist; prevent additional registration and report this condition.
5. Legacy pagehide game records are not trustworthy completed rounds. Mark as legacy/unverified and exclude them from new accuracy/rematch totals, while preserving history for transparency.
6. Retain accounts and learning records across restarts and releases. Document backups and restore steps; "permanent" means durable retention, not a guarantee against disk loss without backups.

Suggested schema (adapt names as needed):

| Table | Important fields and constraints |
| --- | --- |
| users | id, name, email UNIQUE, password_hash, password_salt, password_version, timezone, created_at |
| sessions | token_hash PRIMARY KEY, user_id FK, created_at, expires_at; revoke by deletion |
| study_sessions | id, user_id FK, topic_text, normalized_topic, agent, started_at, completed_at nullable |
| lessons | id, study_session_id FK, full lesson JSON, generated_at, completed_at nullable |
| messages | id, study_session_id FK, role, content, created_at, client_request_id for retry deduplication |
| lesson_checks | id, user_id, lesson_id, step_id, attempt_id UNIQUE, selected_answer, correct, created_at |
| game_runs | id, user_id FK, study_session_id FK, game_type, question_set_id, started_at, completed_at nullable, status |
| game_answers | id, run_id FK, question_id, selected_answer, correct, answered_at; UNIQUE(run_id, question_id) |

Topic linkage must use a stable study-session ID, not the literal game storage value `dynamic`. Keep UTC timestamps and calculate "today" using the learner's saved IANA timezone (default detected timezone; Asia/Kolkata fallback). Group revisions of the same stored topic conservatively; do not merge unrelated topics with AI guesses.

## Authentication and account isolation

- Create a cryptographically random session token at login/registration; save only its hash in the database. Set an HttpOnly, SameSite=Lax, Path=/ cookie and Secure on HTTPS production. Enforce a 14-day server expiry; logout revokes the stored session and expires the cookie.
- Resolve ownership from the session at every endpoint. Never trust a supplied `userId`; verify ownership of requested session, lesson, chat and run IDs.
- Use same-origin validation/CSRF protection for state-changing requests, JSON content-type enforcement, body limits and bounded authentication rate limiting. Avoid persistent account lockouts that let attackers block students.
- Validate body shape before accessing fields. Return consistent public error messages without filesystem paths, raw database exceptions, credentials or hashes.
- Count users and insert the new account in the same transaction so concurrent requests cannot create a 21st account. Duplicate-email failure must not prevent the next valid write.
- Clear or namespace all existing `aiplay_*` learning/session cache when the authenticated user changes. Sign out must clear private rendered data and caches. Handle another tab changing accounts; pending work cannot be attached to the wrong user.
- Real saving requires login. Keep a separate explicit demo flow; never silently treat real learner work as a demo. No password recovery service or email delivery should be invented without a separate requirement.

## Learning and game tracking

1. Load account/session identity before starting or restoring personal learning work. Record the initiating user on the server at request start, not after a long AI response finishes.
2. Save the question, successful AI answer, lesson content, agent and study-session linkage. Expose paginated read endpoints so a student can reopen history from another browser.
3. Persist actual lesson-check attempts and step completion. Generating a lesson is "explored", not "learned" or "completed".
4. Register a question bank on the backend and reference it by ID. Validate submitted answers against that bank, rather than accepting client-supplied accuracy or arbitrary correct counts. Migrate the existing nine-question flow without changing educational content.
5. At the start of each actual game, create a run. Save an answer at the answer-resolution point; complete the run only after all three questions resolve. Bubble is `game2.html`, Rocket is `game1.html`, Fishing is `game3.html`.
6. Integrate with the real answer/advance/end callbacks in each game. Replace `pagehide` scoring; leaving early is incomplete, not a completed 0/3 run.
7. Use stable event IDs and database uniqueness to deduplicate retries/refreshes. A rematch creates a new run ID linked to the same topic/game; it must not overwrite the original result.
8. Await completion persistence before navigating automatically to the next game, or use a retryable per-user outbox with acknowledgement. Show "Saving", "Saved to dashboard" or "Not saved — Retry" honestly. Avoid disabling the whole game indefinitely during a network outage.
9. After Fishing, show Bubble/Rocket/Fishing results, total accuracy, View dashboard and Play again. Keep the current reserved question strip above Fishing's canvas unchanged.

Do not label recall-game performance as a definitive measure of mastery. Track both completed and in-progress activity accurately.

## Dashboard behavior and metrics

Permanent route: `dashboard.html`; real values come from authenticated backend queries on every load. Refresh after return from games/lessons and offer a manual Refresh action. Separate demo fixtures from real state.

| Metric/section | Definition |
| --- | --- |
| Unique topics | Distinct saved topic identities explored by this student; repeat visits do not inflate the count. |
| Questions asked | Persisted user questions in study/chat sessions, distinct from quiz answer attempts. |
| Today's learning | Today's explored topics, checks attempted, lessons completed and games completed in learner timezone. Show empty copy on a day without activity. |
| Lessons completed | Lessons whose required checks/steps meet the existing completion rules, not every generated lesson. |
| Answer accuracy | Correct graded lesson/game answers divided by total graded answers, with separate lesson and game breakdowns. Show an em dash with no attempts. |
| Game history | Game name, topic, completion status, score, date and attempt/rematch number. |
| Rematches | Additional completed runs after the first completed run for the same topic and game. Display progress against prior comparable attempts. |
| Topics to revisit | Topics with recent wrong answers or incomplete lessons; label as practice suggestions, not proven weakness. |
| Conversation/lesson history | Paginated, owner-only saved content, with topic search and Resume/Open controls. |
| Learning activity | A compact seven-day bar display with accessible numeric labels and daily counts; use actual recorded events. |

Top of dashboard: "Hi, {name}" and a date-sensitive summary. Below it: Today/All time control, statistic cards, Today I worked on list, topic progress, recent games/rematches and chat history. Include sensible skeleton/loading, empty, unauthenticated and retry states. Render student/AI text safely; avoid unsafe HTML insertion. Never show unhandled request rejections or redirect loops.

## Endpoint outline

- Keep `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`; replace internals with durable sessions.
- Optional public registration status reveals only whether places are available, never names/emails.
- `/api/dashboard?period=today|all` returns aggregate counts, clearly defined dates, topics and paginated recent activity.
- Add owner-scoped study-session/history detail and lesson-progress endpoints.
- Add game run start, answer and completion endpoints using run/question IDs and idempotency keys.
- Use 401 for missing/expired sessions, 404 for inaccessible resource IDs, 409 for duplicates/capacity conflict, 429 for rate limits and 503 for storage/service unavailability. Client handles all without losing typed work.
- AI lesson/chat routes preserve current response fields and add IDs, keeping the existing UI compatible as tracking is integrated.

## File-by-file implementation order

1. `data-store.js`, `server.js`: database, migration, protected sessions, capacity, owner-scoped APIs and coherent error handling.
2. `auth.js`, `auth.html`, `auth.css`: safe account rendering, state management, form states and demo entry. Move inline page logic into focused scripts as needed.
3. `index.html`, `assistant.html`, shared navigation styles: static visible account buttons and dashboard access on mobile/desktop.
4. `assistant.js`, `learn.js`, `study-utils.js`: persist complete lesson/chat history, restore ownership-safe state and capture lesson attempts. Preserve the image-upload fixes.
5. `activity-tracker.js`, `game2.html`, `game1.html`, `game3.html`, `game-feedback.js`: actual answer/run completion hooks and reliable backend saving. Preserve gameplay and layout.
6. `dashboard.html`, new `dashboard.js`, dashboard styles: real daily/all-time metrics, history, game results and explicit demo fixtures.
7. `.env.example`, `.gitignore`, `README.md`, deployment configuration: storage path, runtime requirements, migration/backup guidance and manual walkthrough. Never copy real credentials into examples.

## Manual acceptance checklist for the user

Do not run these automatically under the current no-testing instruction. Provide links and this checklist when implementation is ready:

- Sign in/Create account visible before API response, on both desktop and mobile.
- Registration asks name/email/password, signs in immediately, greets the correct name and stores the account without Google Cloud or email verification.
- Wrong password, duplicate registration, bad input and network failures show clear errors; a duplicate attempt does not break future valid registrations.
- Accounts 1–20 succeed; account 21 is rejected, including concurrent final-slot requests; existing users can still log in.
- Demo below form works without consuming a place or disclosing real student data.
- Sign in as A, record work, sign out, sign in as B: B cannot view A's dashboard, conversations, lessons, cached topic or game data.
- Browser refresh, server restart and deployment onto configured durable storage preserve accounts/history. Reopen in another browser and confirm restored history.
- Today's summary uses the correct local day, while All time retains past work.
- Ask questions, finish lesson checks, play Bubble/Rocket/Fishing and confirm correct per-topic counts and results.
- Leaving a game early never appears as a completed three-question round. Refresh/retry does not duplicate an answer or completed run.
- Play a rematch: a new run appears, original score remains, and rematch count increases correctly.
- Disconnect during saving: see a retry state, then retry successfully with no duplicate result.
- Fishing question stays above the hook; question-paper image upload still works as previously designed.

## Required next-model handoff

Report implemented behavior and remaining limits precisely. Provide local browser links for sign-in, registration, demo, dashboard and studio using the actual configured port (current server default 4173). Explain any server restart and required persistent-storage setup. State that tests were not run per user preference. Do not call hosting permanent until its storage is durable; do not claim zero errors.
