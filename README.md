# Mira — personal education agents

Mira is a study assistant with three modes: Teacher explains a concept, Exam Coach helps with exam preparation, and Scientist explores how things work. Students can then practise with three topic-based games and review their results.

The app is a Node.js web service. NVIDIA, OpenRouter, and xAI API keys stay on the server, never in browser code. AI features require at least one enabled, working provider with model access.

## Run locally

Use Node.js 24.14.0 or a compatible Node 24 release.

```powershell
Copy-Item .env.example .env
# Edit .env and set the provider keys you have. NVIDIA_API_KEY_2 is an OpenRouter key.
npm start
```

Open `http://127.0.0.1:4173`. Do not commit `.env` or paste your key into frontend files. The server reads `.env` for local development, but also accepts environment variables supplied by the host.

## Deploy on Render

Connect this GitHub repository to a **Render Web Service**. The repository includes `render.yaml` for a Blueprint deployment. For a manual Web Service, use:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run check` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Node version | `.node-version` pins `24.14.0` |

Add these environment variables in the Render dashboard:

| Variable | Value |
| --- | --- |
| `NVIDIA_API_KEY` | NVIDIA Build key; `NVIDIA_API_KEY_1` is also accepted |
| `NVIDIA_API_KEY_2` | OpenRouter key (legacy variable name); `OPENROUTER_API_KEY` is also accepted |
| `GROK_API_KEY_3` | xAI Grok key; opt-in in AI Settings because xAI API usage may be billed |
| `NVIDIA_MODEL` | `nvidia/nemotron-3-ultra-550b-a55b` (default; change only if your account uses another supported model) |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3-ultra-550b-a55b:free` (default) |
| `GROK_MODEL` | `grok-4.3` (default; xAI model access and charges depend on your account) |

Use **AI settings** beside **AI working** on the study or chat page to turn configured providers on or off and choose which one to use first. The choice is saved in that browser and sent with AI requests; it does not change another student's settings. By default, NVIDIA is first and OpenRouter second. Grok starts off to avoid unexpected charges. On a provider error, timeout, or rate limit, the server tries the next enabled provider and temporarily cools down failing providers. This cannot bypass provider/account-wide quotas or guarantee uninterrupted AI service. OpenRouter's free model has its own availability and rate limits. Never put real keys in `render.yaml`, `.env.example`, or GitHub.

If AI status or a lesson, chat, question-bank, or image-reading request fails, the app offers a demo-mode dialog. Learners can stay and retry, or choose a prewritten Fractions, Photosynthesis, or Newton's Laws lesson. Each demo has three checks and a nine-question bank for Bubble, Rocket, and Fishing, without calling an AI API. AI Settings also has an **Explore demo topics** button. Demo chat gives clearly labelled prewritten guidance, not generated answers to arbitrary questions. Signed-in game results can still be recorded while the backend is available, under a topic title marked `(Demo)`.

Do **not** set `PORT` manually on Render. The server listens on Render's assigned port and binds to `0.0.0.0` in production. For Blueprint deployment, Render prompts for the three keys; for an existing service, enter or update them under **Environment** in the dashboard. Your local `.env` is not copied to Render.

After deployment, visit the URL shown by Render. The status indicator checks the enabled providers. `/healthz` verifies that the web server is up; it intentionally does not call an AI provider, so it can remain healthy while AI is unavailable.

## Checks

`npm run check` validates the server and frontend JavaScript syntax. The repository also contains browser and live-provider verification scripts under `scripts/`; the live-provider script needs a valid API key. See `MIRA_VERIFICATION.md` for details.

## Security and limits

This is a single-process app. Signed-in student accounts and recorded learning activity use the server database; an active lesson can also use browser session storage. Avoid claiming exam readiness solely from game scores. NVIDIA model availability and response quality depend on the provider and your account.
# Student accounts and dashboard

Run `npm start`, then open `http://127.0.0.1:4173/`. The home page has **Sign in** and **Create account** buttons. Registration takes a name, email address, and a new Aiplay password. It does not use Google Cloud or email verification. Up to 20 students can register; existing students can always sign in. `auth.html` also has a demo dashboard link with sample data that does not create an account.

Account and learning records are stored in SQLite at `data/aiplay.sqlite` by default. An existing `data/aiplay-data.json` file is imported once and retained. Set `DATA_DIR` to a backed-up persistent volume for hosted deployments; the current free Render configuration does **not** guarantee that local files survive a redeploy. Keep the database and its WAL/SHM files private and back up the entire data directory together.

The dashboard is at `http://127.0.0.1:4173/dashboard.html`. It shows each signed-in student's topics, activity today, chat questions/answers, completed game rounds, accuracy, and rematches. Game activity requires completing a game; leaving a game early does not count as a completed round.

## Render deployment

[Deploy this repository to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fpavankondilla%2Fpersonal-education-agents)

The repository's `render.yaml` creates a Node web service, installs locked dependencies with `npm ci`, runs syntax checks, starts `node server.js`, and checks `/healthz`. Set `NVIDIA_API_KEY` in Render before expecting AI lessons or question-paper image extraction to work. The checked-in `.node-version` pins the Node 24 runtime used by the server.

Render's free web service has ephemeral local storage. Sign-in and the dashboard can run there, but student accounts and learning records stored in SQLite will be lost on a restart or redeploy. For lasting student accounts, attach a persistent disk to a paid Render web service and set `DATA_DIR` to its mount path, or migrate the store to a durable hosted database. Do not move real users to the free configuration and describe it as permanent storage.
