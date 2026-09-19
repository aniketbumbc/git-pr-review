# AI PR Review Bot

An AI-powered GitHub pull request reviewer. A webhook triggers an [Inngest](https://www.inngest.com/) function that fetches the PR's diff, runs it through an OpenAI Agents SDK reviewer, posts the review as a PR comment, and stores the result for a dashboard to display.

## How it works

1. GitHub sends a `pull_request` webhook (`opened`, `reopened`, `synchronize`) to the backend, or a review is triggered manually via `POST /reviews/trigger`.
2. The backend verifies the webhook signature and sends a `github/pull_request.review` event to Inngest.
3. An Inngest function runs a linear pipeline of steps:
   - fetch PR info
   - fetch the PR's changed files/diff
   - run the diff through an AI review agent (`@openai/agents`)
   - post the review as a comment on the PR
   - save the review (verdict, suggestions, critical fixes) to Postgres
4. Each step's progress is tracked in the database so the frontend can show live run status, not just the final result.
5. A Next.js dashboard lists past reviews, review stats/trends, and lets you trigger new reviews and watch a run's step-by-step progress.

## Project structure

```
back-end/    Express API + Inngest functions + AI review agent (Node.js)
front-end/   Next.js dashboard (App Router)
docker-compose.yml   Runs both services together
```

### Backend (`back-end/`)

- `index.js` — Express app: GitHub webhook receiver, manual trigger endpoint, and read APIs for reviews/stats/run progress.
- `agents/github-pr-review-agents.js` — the OpenAI Agent that produces the structured review (verdict, critical fixes, suggestions).
- `functions/github-review.js` — the Inngest function implementing the review pipeline.
- `lib/` — GitHub client (Octokit), Postgres client, step-tracking helpers, casing utils.
- `db/migrate.js` — database migrations.
- `future-scope.txt` — notes on planned Inngest-driven improvements (debouncing, concurrency limits, multi-agent fan-out, human-in-the-loop approval, etc).

### Frontend (`front-end/`)

- `app/dashboard/` — stats, verdict mix, live activity feed, manual trigger panel.
- `app/reviews/` — review list/detail views.
- `app/runs/` — run timeline/progress views.
- `app/about/` — pipeline overview page.

## Getting started

### Backend

```bash
cd back-end
pnpm install
cp .env.example .env   # configure DB, GITHUB_WEBHOOK_SECRET, OPENAI key, etc.
pnpm db:migrate
pnpm dev
```

The API runs on port 3000. To run Inngest locally alongside it:

```bash
pnpm start-inngest
```

### Frontend

```bash
cd front-end
pnpm install
pnpm dev
```

The dashboard runs on port 3001 and expects the backend at `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3000`).

### Docker

```bash
docker compose up --build
```

## Tech stack

- **Backend**: Node.js, Express, Inngest, `@openai/agents`, Octokit, PostgreSQL, Zod
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
