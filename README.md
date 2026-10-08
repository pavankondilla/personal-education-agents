# Mira — personal education agents

Mira is a study assistant with three modes: Teacher explains a concept, Exam Coach helps with exam preparation, and Scientist explores how things work. Students can then practise with three topic-based games and review their results.

The app is a Node.js web service. Its NVIDIA API key is used only on the server, never in browser code. AI features require a working NVIDIA API key and model access; the app reports an unavailable state when the provider cannot be reached.

## Run locally

Use Node.js 24.14.0 or a compatible Node 24 release.

```powershell
Copy-Item .env.example .env
# Edit .env and set NVIDIA_API_KEY to your own key.
npm start
```

Open `http://127.0.0.1:4173`. Do not commit `.env` or paste your key into frontend files. The server reads `.env` for local development, but also accepts environment variables supplied by the host.

## Deploy on Render

Connect this GitHub repository to a **Render Web Service**. The repository includes `render.yaml` for a Blueprint deployment. For a manual Web Service, use:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm install && npm run check` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Node version | `.node-version` pins `24.14.0` |

Add these environment variables in the Render dashboard:

| Variable | Value |
| --- | --- |
| `NVIDIA_API_KEY` | Your private NVIDIA API key (required for AI features) |
| `NVIDIA_MODEL` | `nvidia/nemotron-3-ultra-550b-a55b` (default; change only if your account uses another supported model) |

Do **not** set `PORT` manually on Render. The server listens on Render's assigned port and binds to `0.0.0.0` in production. For Blueprint deployment, Render will prompt for `NVIDIA_API_KEY`; for an existing service, enter or update it under **Environment** in the dashboard. Never put the real key in `render.yaml`, `.env.example`, or GitHub.

After deployment, visit the URL shown by Render. The small status indicator shows whether AI is reachable. `/healthz` verifies that the web server is up; it intentionally does not call NVIDIA, so it can remain healthy while the AI provider is unavailable. The app's AI status endpoint and UI provide the separate provider check.

## Checks

`npm run check` validates the server and frontend JavaScript syntax. The repository also contains browser and live-provider verification scripts under `scripts/`; the live-provider script needs a valid API key. See `MIRA_VERIFICATION.md` for details.

## Security and limits

This is a single-process app. Study progress is currently stored in the student's browser, not in a shared database, so it will not follow them between devices or survive cleared browser storage. The backend does not provide user accounts. Avoid claiming exam readiness solely from game scores. NVIDIA model availability and response quality depend on the provider and your account.
# Student accounts and dashboard

Run `npm start`, then open `http://127.0.0.1:4173/`. The home page has **Sign in** and **Create account** buttons. Registration takes a name, email address, and a new Aiplay password. It does not use Google Cloud or email verification. Up to 20 students can register; existing students can always sign in. `auth.html` also has a demo dashboard link with sample data that does not create an account.

Account and learning records are stored in SQLite at `data/aiplay.sqlite` by default. An existing `data/aiplay-data.json` file is imported once and retained. Set `DATA_DIR` to a backed-up persistent volume for hosted deployments; the current free Render configuration does **not** guarantee that local files survive a redeploy. Keep the database and its WAL/SHM files private and back up the entire data directory together.

The dashboard is at `http://127.0.0.1:4173/dashboard.html`. It shows each signed-in student's topics, activity today, chat questions/answers, completed game rounds, accuracy, and rematches. Game activity requires completing a game; leaving a game early does not count as a completed round.

## Render deployment

[Deploy this repository to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fpavankondilla%2Fpersonal-education-agents)

The repository's `render.yaml` creates a Node web service, installs locked dependencies with `npm ci`, runs syntax checks, starts `node server.js`, and checks `/healthz`. Set `NVIDIA_API_KEY` in Render before expecting AI lessons or question-paper image extraction to work. The checked-in `.node-version` pins the Node 24 runtime used by the server.

Render's free web service has ephemeral local storage. Sign-in and the dashboard can run there, but student accounts and learning records stored in SQLite will be lost on a restart or redeploy. For lasting student accounts, attach a persistent disk to a paid Render web service and set `DATA_DIR` to its mount path, or migrate the store to a durable hosted database. Do not move real users to the free configuration and describe it as permanent storage.
