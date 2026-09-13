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
    const pullRequestInfo = await step.run(
      'fetch-pull-request-info',
      async () => {
        const { owner, repo, pull_number } = event.data;
        console.log('fetching pull request info', owner, repo, pull_number);

        const { data } = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number,
        });

        return data;
      },
    );

    console.log('pullRequestInfo', pullRequestInfo);

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

    return {
      title: pullRequestInfo.title,
      id: pullRequestInfo.id,
      diff_url: pullRequestInfo.diff_url,
      state: pullRequestInfo.state,
      comments: pullRequestInfo.comments,
      url: pullRequestInfo.url,
      commits: pullRequestInfo.commits,
      changed_files: pullRequestInfo.changed_files,
    };
  },
);
