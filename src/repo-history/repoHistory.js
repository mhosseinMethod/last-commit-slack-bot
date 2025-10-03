require('dotenv').config({ path: '.env.local' });
const { Octokit } = require('@octokit/rest');
const { summarizePR, summarizeRepoActivity } = require('./aiSummary');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * Format a date to relative time (e.g., "2 days ago")
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

/**
 * Get PR info for a commit SHA
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @returns {Promise<Object|null>} - PR info or null if no PR found
 */
async function getPRForCommit(owner, repo, sha) {
  try {
    const response = await octokit.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: sha
    });

    if (response.data.length > 0) {
      const prData = response.data[0]; // Get the first/main PR

      // Fetch full PR details to get the body (description)
      const prDetails = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prData.number
      });

      const pr = prDetails.data;

      // Fetch PR reviews to find Copilot's summary
      let copilotOverview = null;
      try {
        const reviewsResponse = await octokit.pulls.listReviews({
          owner,
          repo,
          pull_number: pr.number
        });

        // Look for Copilot bot review
        const copilotReview = reviewsResponse.data.find(review =>
          review.user.login === 'copilot' ||
          review.user.login.includes('copilot') ||
          review.user.type === 'Bot' ||
          (review.body && review.body.includes('Pull Request Overview'))
        );

        if (copilotReview) {
          // Extract the overview section from Copilot's review
          const overviewMatch = copilotReview.body.match(/## Pull Request Overview\s+([\s\S]*?)(?=\n##|$)/);
          if (overviewMatch) {
            copilotOverview = overviewMatch[1].trim();
          } else {
            // If no specific section, use the whole review body
            copilotOverview = copilotReview.body;
          }
        }
      } catch (reviewError) {
        // Silently fail if we can't fetch reviews
      }

      return {
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        mergedAt: pr.merged_at,
        body: pr.body,
        copilotOverview: copilotOverview
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get last N commits from a repository
 * @param {string} repoName - Repo name (e.g., "runtime-core") - will be prefixed with "methodcrm/"
 * @param {number} noOfCommits - Number of commits to fetch (default: 5)
 * @param {string} branchName - Branch name to fetch commits from (default: "master")
 * @returns {Promise<Object>} - {success: bool, commits: [...], summary: string}
 */
async function getRepoCommits(repoName, noOfCommits = 5, branchName = 'master') {
  try {
    // Auto-prefix with methodcrm/
    const owner = 'methodcrm';
    const repo = repoName;

    // Fetch commits from GitHub API
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branchName,
      per_page: noOfCommits
    });

    // Format commit data and fetch PR info for each
    const commits = await Promise.all(
      response.data.map(async (commit) => {
        const prInfo = await getPRForCommit(owner, repo, commit.sha);

        // Generate AI summary for PR if Copilot overview exists
        let aiSummary = null;
        if (prInfo && prInfo.copilotOverview) {
          aiSummary = await summarizePR(prInfo.copilotOverview, prInfo.title);
        }

        return {
          hash: commit.sha.substring(0, 7),
          fullHash: commit.sha,
          message: commit.commit.message.split('\n')[0], // First line only
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          relativeTime: formatRelativeTime(commit.commit.author.date),
          url: commit.html_url,
          pr: prInfo ? {
            ...prInfo,
            aiSummary // AI-generated summary of the PR
          } : null
        };
      })
    );

    // Generate overall summary of all commits
    const overallSummary = await summarizeRepoActivity(commits);

    return {
      success: true,
      commits,
      summary: overallSummary // AI-generated summary of recent activity
    };

  } catch (error) {
    // Handle different error types
    if (error.status === 404) {
      return {
        success: false,
        message: 'Repository not found'
      };
    } else if (error.status === 403) {
      return {
        success: false,
        message: 'Rate limit exceeded or access forbidden'
      };
    } else if (error.status === 401) {
      return {
        success: false,
        message: 'Invalid GitHub token or authentication failed'
      };
    } else {
      return {
        success: false,
        message: `GitHub API error: ${error.message}`
      };
    }
  }
}

module.exports = {
  getRepoCommits,
  formatRelativeTime
};
