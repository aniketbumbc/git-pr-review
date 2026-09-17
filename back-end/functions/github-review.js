import { inngest } from '../inggest/client.js';
import { octokit } from '../lib/github.js';
import { db } from '../lib/db.js';
import { run } from '@openai/agents';
import { prReviewAgent } from '../agents/github-pr-review-agents.js';

export const githubPullRequestReview = inngest.createFunction(
  {
    id: 'github-pull-request-review',
    triggers: [
      {
        event: 'github/pull_request.review',
      },
    ],
  },
  async ({ event, step }) => {
    const { owner, repo, pull_number } = event.data;
    const pullRequestInfo = await step.run(
      'fetch-pull-request-info',
      async () => {
        const { data } = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number,
        });

        return {
          title: data.title,
          id: data.id,
          diff_url: data.diff_url,
          state: data.state,
          comments: data.comments,
          url: data.url,
          commits: data.commits,
          changed_files: data.changed_files,
          head: { ref: data.head.ref, sha: data.head.sha },
        };
      },
    );

    if (!pullRequestInfo) {
      return {
        message: 'Pull request not found',
        skip: true,
        completed: false,
      };
    }

    if (pullRequestInfo.state !== 'open') {
      return {
        message: 'Pull request is not open',
        skip: true,
        completed: false,
      };
    }

    const changes = await step.run(
      'fetch-changes-in-pull-request',
      async () => {
        const changesResult = await octokit.paginate(
          octokit.rest.pulls.listFiles,
          {
            owner,
            repo,
            pull_number,
            per_page: 100,
          },
        );
        return changesResult.map((file) => {
          return {
            fileName: file.filename,
            status: file.status,
            changes: file.changes,
            patch: file.patch,
            additions: file.additions,
            deletions: file.deletions,
          };
        });
      },
    );

    if (changes.length === 0) {
      return {
        message: 'No changes in the pull request',
        skip: true,
        completed: false,
      };
    }
    // Ai analysis of the changes

    const aiAnalysisResult = await step.run(
      'ai-analysis-of-changes',
      async () => {
        const llmResult = await run(
          prReviewAgent,
          `
        Pull request information:
        ${JSON.stringify(pullRequestInfo, null, 2)}

        Changes in the pull request:
        ${JSON.stringify(changes, null, 2)}
        `,
        );
        return {
          result: llmResult.finalOutput,
        };
      },
    );

    // write comment on the pull request

    await step.run('post-comment', async () => {
      const result = await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number,
        event: 'COMMENT',
        commit_id: pullRequestInfo.head.sha,
        body: `
        ${aiAnalysisResult.result.content}
        Critical fixes:
        ${aiAnalysisResult.result.critical_fixes?.join('\n')}
        Suggestions:
        ${aiAnalysisResult.result.suggestions?.join('\n')}
        `,
      });
    });

    await step.run('save-review-to-db', async () => {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const { rows } = await client.query(
          `INSERT INTO reviews
           (owner, repo, pull_number, pr_title, head_sha, changed_files_count,
            commits_count, verdict, content, critical_fixes, suggestions, event_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            owner,
            repo,
            pull_number,
            pullRequestInfo.title,
            pullRequestInfo.head.sha,
            pullRequestInfo.changed_files,
            pullRequestInfo.commits,
            aiAnalysisResult.result.event,
            aiAnalysisResult.result.content,
            JSON.stringify(aiAnalysisResult.result.critical_fixes ?? []),
            JSON.stringify(aiAnalysisResult.result.suggestions ?? []),
            event.id,
          ],
        );
        const reviewId = rows[0].id;

        for (const file of changes) {
          await client.query(
            `INSERT INTO review_files
             (review_id, path, status, additions, deletions, patch)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              reviewId,
              file.fileName,
              file.status,
              file.additions,
              file.deletions,
              file.patch ?? null,
            ],
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });

    return {
      message: 'Pull request reviewed successfully',
      skip: false,
      completed: true,
      result: aiAnalysisResult.result,
    };
  },
);
