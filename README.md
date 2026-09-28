# AI Personal Tutor

A study platform for students: a patient tutor that explains concepts step by step, teaches from your own notes, quizzes you, and tracks where you need more practice. Tutor answers and quizzes come from **Google Gemini**, called only from the server.

## Features

- **Tutor** — a study workspace, not a generic chatbot. The tutor starts from the basics when needed, uses examples and analogies, checks understanding with short questions, spots misconceptions, and gives hints before answers. One-click actions: *Explain simply*, *Give an example*, *Give me a question*, *Quiz me*, *Summarize*. Conversations are saved per study session.
- **Study materials** — upload PDF or TXT files (up to 10 MB). Text is extracted once on upload. When you study a material, the tutor and quizzes use it as their source.
- **Quizzes** — multiple-choice quizzes generated from a topic or a material, shown one question at a time. Answers are checked on the server, each comes with an explanation, and the results screen shows your score, what you missed, and the concepts to revise.
- **Progress** — overall accuracy, questions attempted, topics studied, study time, recent quiz scores, accuracy per topic, weak topics, and a list of missed questions to review.
- **Demo Mode** — a ready-made *Data Structures* workspace (Arrays, Linked Lists, Recursion, Binary Trees) with study notes, past study sessions, quiz history and progress. It needs no setup, and it's kept separate from your own data.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, route handlers, server actions) with TypeScript
- Tailwind CSS v4
- Google Gemini via the official [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK (server-side only)
- SQLite through Node's built-in `node:sqlite` module (no native dependencies, no database server)
- `unpdf` for PDF text extraction, `react-markdown` for rendering tutor replies, `lucide-react` icons

## Screenshots

_Add screenshots here:_

| Dashboard | Tutor | Quiz | Progress |
| --- | --- | --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Tutor](docs/screenshots/tutor.png) | ![Quiz](docs/screenshots/quiz.png) | ![Progress](docs/screenshots/progress.png) |

## Local setup

Requirements: **Node.js 22.13 or newer** (Node 24 recommended). `node:sqlite` is built into these versions.

```bash
cd ai-personal-tutor
npm install
cp .env.example .env.local   # then add your Gemini API key
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes, for live tutoring | Your Google Gemini API key. Create one at [Google AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | No | Gemini model ID. Defaults to `gemini-3.8-flash`. Older models such as `gemini-2.5-flash` are no longer available to new API keys. |
| `GEMINI_FALLBACK_MODELS` | No | Ordered, comma-separated backup models tried when the main model is busy (503), over quota (429), unavailable or slow. Defaults to `gemini-3.7-flash,gemini-3.5-flash-lite`; set it to an empty value to use only `GEMINI_MODEL`. |
| `DATABASE_DIR` | No | Folder for the SQLite file. Defaults to `./data/db` (or `/tmp` on Vercel). |

The key is read only in server code (`lib/gemini.ts`, which imports `server-only`). The browser talks to the app's own API routes (`/api/chat`, `/api/quiz`), never to Gemini directly. `.env.local` is git-ignored — never commit your key.

## Running the project

```bash
npm run dev      # development server at http://localhost:3000
npm run build    # production build
npm start        # run the production build
npm run lint
```

## Demo Mode

1. Open the site and click **Try Demo**.
2. You land on the dashboard of a sample student, Yoson, studying Data Structures.
3. Suggested presentation flow:
   1. **Dashboard** → click **Continue** (Recursion) to open the tutor.
   2. Ask a question, or use *Explain simply* / *Give an example* / *Give me a question*.
   3. Open **Materials** and click **View** on a study guide.
   4. Open **Quiz**, choose a material, and click **Generate quiz**.
   5. Answer a question to see the feedback and explanation.
   6. Open **Progress** to see accuracy, scores and weak topics.

Every time you click **Try Demo** (or **Reset demo** in the banner), the demo workspace is rebuilt from scratch, so each presentation starts from the same state. **Exit demo** switches to your personal workspace. The two are stored separately, and nothing done in the demo touches personal data.

With `GEMINI_API_KEY` set, the demo tutor and quizzes use live Gemini responses. If Gemini is overloaded, out of quota or slow, the demo never waits through retries:

- Each demo request works down the model chain (`gemini-3.8-flash` → `gemini-3.7-flash` → `gemini-3.5-flash-lite`) without retrying any model. If no reply has started within 8 seconds in total (15 seconds for a quiz), the demo uses a prepared answer or the built-in question bank instead.
- A model that just failed is skipped for a minute (ten minutes after a quota error), so later demo requests go straight to a working model or to prepared content.
- Anything that didn't come from Gemini is labelled **"Demo fallback — prepared response"** (or **"prepared questions"** on a quiz), so it's never passed off as a live answer.

Without a key, the demo uses prepared content throughout, and the banner says so.

Personal mode never uses prepared content. It works down the same model chain (up to 40 seconds for a reply, 60 for a quiz), and if every live model fails it says so clearly.

## Deployment

The app needs a Node.js server (API routes and SQLite), so deploy it somewhere that runs `next start`.

**Render / Railway / Fly.io / any VPS (recommended for keeping data):**

1. Push the `ai-personal-tutor` folder to a GitHub repository.
2. Create a Node web service with build command `npm install && npm run build` and start command `npm start`.
3. Set `GEMINI_API_KEY` in the service's environment variables.
4. Attach a persistent disk/volume and set `DATABASE_DIR` to its mount path (e.g. `/data`) so uploads and progress survive restarts.

**Vercel (fine for a demo):**

1. Import the repository in Vercel and set the root directory to `ai-personal-tutor`.
2. Add `GEMINI_API_KEY` under *Settings → Environment Variables*.
3. Deploy.

On Vercel the database lives in `/tmp`, which is temporary and per-instance. Demo Mode works fine, because it rebuilds itself on entry. Personal uploads and progress may reset, though, so use a host with a persistent disk for real use.

## Project structure

```
app/
  page.tsx               Landing page
  actions.ts             Server actions (enter demo, start session, delete material…)
  (app)/                 Signed-in area: dashboard, tutor, materials, quiz, progress
  api/chat/              Streams tutor replies from Gemini
  api/materials/         PDF/TXT upload and text extraction
  api/quiz/              Quiz generation and answer checking
components/              UI components (chat, quiz runner, upload form, …)
lib/
  gemini.ts              Gemini client + user-friendly error mapping (server-only)
  prompts.ts             Tutor and quiz prompts
  db.ts, data.ts         SQLite schema and queries
  progress.ts            Progress statistics
  demo.ts                Demo seeding and offline fallback replies
data/                    Demo study notes, question bank, sample replies
types/                   Shared TypeScript types
```

## Notes

- Scanned PDFs (images of pages) contain no text layer and can't be read yet.
- Very long documents are trimmed to roughly the first 40 pages when sent to the tutor. The study panel says when this happens.
- Tutor answers can be wrong; check important facts against your course material.
