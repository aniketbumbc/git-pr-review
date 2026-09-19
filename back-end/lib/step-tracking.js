import { db } from './db.js';

// Records our own durable step history for an Inngest run, since Inngest's
// REST /jobs endpoint only reflects the live execution queue and returns
// nothing once a run completes.

export async function recordStepStart(eventId, position, name) {
  await db.query(
    `INSERT INTO review_run_steps (event_id, position, name, status, attempts, started_at, updated_at)
     VALUES ($1, $2, $3, 'running', jsonb_build_array(jsonb_build_object('attempt', 1, 'at', now())), now(), now())
     ON CONFLICT (event_id, position) DO UPDATE SET
       status = 'running',
       attempts = review_run_steps.attempts || jsonb_build_array(
         jsonb_build_object('attempt', jsonb_array_length(review_run_steps.attempts) + 1, 'at', now())
       ),
       updated_at = now()`,
    [eventId, position, name],
  );
}

export async function recordStepSuccess(eventId, position) {
  await db.query(
    `UPDATE review_run_steps
     SET status = CASE WHEN jsonb_array_length(attempts) > 1 THEN 'retried' ELSE 'succeeded' END,
         ended_at = now(), updated_at = now()
     WHERE event_id = $1 AND position = $2`,
    [eventId, position],
  );
}

export async function recordStepFailure(eventId, position) {
  await db.query(
    `UPDATE review_run_steps
     SET status = 'failed', ended_at = now(), updated_at = now()
     WHERE event_id = $1 AND position = $2`,
    [eventId, position],
  );
}

export async function fetchStepHistory(eventId) {
  const { rows } = await db.query(
    `SELECT position, name, status, attempts, started_at, ended_at
     FROM review_run_steps
     WHERE event_id = $1
     ORDER BY position`,
    [eventId],
  );
  return rows;
}
