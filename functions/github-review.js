import { inngest } from '../inggest/client.js';
import { octokit } from '../lib/github.js';

/**
 * Event:{
 * data:{
 * "owner":"aniketbumbc",
 * "repo":"inngest-demo",
 * "pull_number":1,
 *
 * }
 *
 * }
 *
 *
 */

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
  },
);
