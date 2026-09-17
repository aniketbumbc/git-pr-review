import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

import { serve } from 'inngest/express';
import { inngest } from './inggest/client.js';
import { functions } from './functions/index.js';
import { db } from './lib/db.js';
import { toCamelCase } from './lib/case.js';

const triggerReviewSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  pull_number: z.coerce.number().int().positive(),
});

const reviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  repo: z.string().min(1).optional(),
  verdict: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).optional(),
  search: z.string().min(1).optional(),
  since: z.coerce.date().optional(),
});

// The Inngest function runs these steps strictly in sequence (no branching,
// no parallel steps), so a job's queue "position" maps 1:1 to this list.
// Inngest's REST API doesn't expose step names/output directly — see
// getRunProgressForEvent below for what it actually gives us.
const REVIEW_STEP_NAMES = [
  'fetch-pull-request-info',
  'fetch-changes-in-pull-request',
  'ai-analysis-of-changes',
  'post-comment',
  'save-review-to-db',
];

const INNGEST_BASE_URL = (
  process.env.INNGEST_BASE_URL || 'http://localhost:8288'
).replace(/\/$/, '');
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY;

async function inngestApiFetch(path) {
  const res = await fetch(`${INNGEST_BASE_URL}${path}`, {
    headers: INNGEST_SIGNING_KEY
      ? { Authorization: `Bearer ${INNGEST_SIGNING_KEY}` }
      : {},
  });
  if (!res.ok) {
    throw new Error(`Inngest API ${path} responded ${res.status}`);
  }
  return res.json();
}

// Inngest's /jobs endpoint only reports { position, attempt, at } per job —
// no step name, status, or output. We reconstruct a step timeline from that:
// - a position reached before the current frontier must have succeeded
//   (the function only advances past a step once it completes)
// - the frontier position's status follows the overall run status
// - a step's approximate duration is the gap to the next step's first
//   attempt (or the run's end time, for the last step) — a wall-clock proxy,
//   not an exact per-step duration, since Inngest doesn't expose that either.
async function getRunProgressForEvent(eventId) {
  const runsBody = await inngestApiFetch(`/v1/events/${eventId}/runs`);
  const run = runsBody.data?.[0];
  if (!run) return null;

  const jobsBody = await inngestApiFetch(`/v1/runs/${run.run_id}/jobs`);
  const jobs = jobsBody.data ?? [];

  const attemptsByPosition = new Map();
  for (const job of jobs) {
    const list = attemptsByPosition.get(job.position) ?? [];
    list.push(job);
    attemptsByPosition.set(job.position, list);
  }

  const positionsReached = [...attemptsByPosition.keys()];
  const maxPosition = positionsReached.length
    ? Math.max(...positionsReached)
    : -1;

  const steps = REVIEW_STEP_NAMES.map((name, position) => {
    const attempts = (attemptsByPosition.get(position) ?? [])
      .slice()
      .sort((a, b) => a.attempt - b.attempt)
      .map((a) => ({ attempt: a.attempt + 1, at: a.at }));

    let status;
    if (position > maxPosition) {
      status = 'pending';
    } else if (position < maxPosition) {
      status = attempts.length > 1 ? 'retried' : 'succeeded';
    } else if (run.status === 'Completed') {
      status = attempts.length > 1 ? 'retried' : 'succeeded';
    } else if (run.status === 'Running') {
      status = 'running';
    } else {
      status = 'failed';
    }

    return { name, position, status, attempts };
  });

  const stepsWithDuration = steps.map((step, i) => {
    const startedAt = step.attempts[0]?.at ?? null;
    const nextStartedAt = steps[i + 1]?.attempts[0]?.at ?? null;
    const endedAt =
      nextStartedAt ?? (i === maxPosition ? run.ended_at : null);
    const ms =
      startedAt && endedAt
        ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
        : null;
    return { ...step, startedAt, ms };
  });

  return {
    runId: run.run_id,
    status: run.status,
    startedAt: run.run_started_at,
    endedAt: run.ended_at,
    output: run.output ?? null,
    steps: stepsWithDuration,
  };
}

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:3001'
).split(',');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/inngest', serve({ client: inngest, functions }));

app.post('/reviews/trigger', async (req, res) => {
  const parsed = triggerReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { owner, repo, pull_number } = parsed.data;
  const { ids } = await inngest.send({
    name: 'github/pull_request.review',
    data: { owner, repo, pull_number },
  });

  res.status(202).json({ message: 'Review triggered', eventId: ids[0] });
});

app.get('/reviews', async (req, res) => {
  const parsed = reviewsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: 'Invalid query params', errors: parsed.error.issues });
  }

  const { limit, offset, repo, verdict, search, since } = parsed.data;

  const conditions = [];
  const params = [];

  if (repo) {
    const [repoOwner, repoName] = repo.includes('/')
      ? repo.split('/')
      : [null, repo];
    if (repoOwner) {
      params.push(repoOwner);
      conditions.push(`owner = $${params.length}`);
    }
    params.push(repoName);
    conditions.push(`repo = $${params.length}`);
  }

  if (verdict) {
    params.push(verdict);
    conditions.push(`verdict = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`pr_title ILIKE $${params.length}`);
  }

  if (since) {
    params.push(since.toISOString());
    conditions.push(`created_at >= $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM reviews ${whereClause}`,
    params,
  );

  const limitPos = params.length + 1;
  const offsetPos = params.length + 2;
  const { rows } = await db.query(
    `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${limitPos} OFFSET $${offsetPos}`,
    [...params, limit, offset],
  );

  res.json({
    data: toCamelCase(rows),
    total: countResult.rows[0].total,
    limit,
    offset,
  });
});

app.get('/reviews/stats', async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE created_at >= now() - interval '7 days'
      )::int AS reviews_last_7_days,
      COUNT(*) FILTER (
        WHERE created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      )::int AS reviews_prev_7_days,
      COALESCE(AVG(jsonb_array_length(critical_fixes::jsonb)) FILTER (
        WHERE created_at >= now() - interval '7 days'
      ), 0)::float AS avg_critical_fixes_last_7_days,
      COALESCE(AVG(jsonb_array_length(critical_fixes::jsonb)) FILTER (
        WHERE created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      ), 0)::float AS avg_critical_fixes_prev_7_days
    FROM reviews
  `);

  res.json(toCamelCase(rows[0]));
});

app.get('/reviews/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reviews WHERE id = $1', [
    req.params.id,
  ]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json(toCamelCase(rows[0]));
});

app.get('/reviews/:id/run', async (req, res) => {
  const { rows } = await db.query(
    'SELECT event_id FROM reviews WHERE id = $1',
    [req.params.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }

  const eventId = rows[0].event_id;
  if (!eventId) {
    return res
      .status(404)
      .json({ message: 'No run recorded for this review' });
  }

  try {
    const progress = await getRunProgressForEvent(eventId);
    if (!progress) {
      return res
        .status(404)
        .json({ message: 'No run found for this review' });
    }
    res.json(progress);
  } catch (err) {
    res
      .status(502)
      .json({ message: 'Run history unavailable', error: err.message });
  }
});

app.get('/runs/by-event/:eventId', async (req, res) => {
  try {
    const progress = await getRunProgressForEvent(req.params.eventId);
    if (!progress) {
      return res.status(404).json({ message: 'No run found for this event' });
    }
    res.json(progress);
  } catch (err) {
    res
      .status(502)
      .json({ message: 'Run history unavailable', error: err.message });
  }
});

app.get('/reviews/:id/files', async (req, res) => {
  const reviewCheck = await db.query('SELECT id FROM reviews WHERE id = $1', [
    req.params.id,
  ]);
  if (reviewCheck.rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }

  const { rows } = await db.query(
    `SELECT path, status, additions, deletions, patch
     FROM review_files
     WHERE review_id = $1
     ORDER BY id`,
    [req.params.id],
  );
  res.json({ data: toCamelCase(rows) });
});

app.get('/reviews/:owner/:repo/:pull_number', async (req, res) => {
  const { owner, repo } = req.params;
  const pullNumber = Number(req.params.pull_number);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
    return res
      .status(400)
      .json({ message: 'pull_number must be a positive integer' });
  }

  const { rows } = await db.query(
    `SELECT * FROM reviews
     WHERE owner = $1 AND repo = $2 AND pull_number = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [owner, repo, pullNumber],
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.json(toCamelCase(rows[0]));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
