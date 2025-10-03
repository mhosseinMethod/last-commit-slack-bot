const { Octokit } = require('@octokit/rest');

/**
 * Get commit history for a specific file in a GitHub repository
 * @param {string} repoName - Repository name in format "owner/repo"
 * @param {string} filePath - Path to the file in the repository
 * @param {string} githubToken - GitHub personal access token
 * @param {string} branchName - Branch name to fetch commits from (default: "master")
 * @returns {Promise<Object>} Object containing success status, commits array, file path, and any errors
 */
async function getFileCommits(repoName, filePath, githubToken, branchName = 'master') {
  try {
    // Input validation
    if (!repoName || typeof repoName !== 'string') {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'Invalid repository name. Expected format: "owner/repo"'
      };
    }

    if (!filePath || typeof filePath !== 'string') {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'Invalid file path. Please provide a valid file path.'
      };
    }

    if (!githubToken || typeof githubToken !== 'string') {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'GitHub token is required'
      };
    }

    // Parse owner and repo from repoName
    const repoParts = repoName.split('/');
    if (repoParts.length !== 2) {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'Invalid repository format. Expected "owner/repo"'
      };
    }

    const [owner, repo] = repoParts;

    // Initialize Octokit with authentication
    const octokit = new Octokit({
      auth: githubToken
    });

    // Fetch commits for the specific file
    const response = await octokit.rest.repos.listCommits({
      owner: owner,
      repo: repo,
      path: filePath,
      sha: branchName,
      per_page: 5
    });

    // Check if any commits were found
    if (!response.data || response.data.length === 0) {
      return {
        success: true,
        commits: [],
        file: filePath,
        error: `No commits found for file: ${filePath}`
      };
    }

    // Format the commits data
    const commits = response.data.map(commit => ({
      hash: commit.sha.substring(0, 7), // Short hash
      fullHash: commit.sha, // Full hash for URL
      message: commit.commit.message.split('\n')[0], // First line of commit message
      author: commit.commit.author.name,
      email: commit.commit.author.email,
      date: commit.commit.author.date,
      url: commit.html_url
    }));

    return {
      success: true,
      commits: commits,
      file: filePath,
      error: null
    };

  } catch (error) {
    // Handle specific GitHub API errors
    if (error.status === 404) {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: `Repository "${repoName}" or file "${filePath}" not found. Please check the repository name and file path.`
      };
    }

    if (error.status === 403) {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'GitHub API rate limit exceeded or insufficient permissions. Please check your token.'
      };
    }

    if (error.status === 401) {
      return {
        success: false,
        commits: [],
        file: filePath,
        error: 'Authentication failed. Please check your GitHub token.'
      };
    }

    // Generic error handler
    return {
      success: false,
      commits: [],
      file: filePath,
      error: `Failed to fetch file history: ${error.message}`
    };
  }
}

/**
 * Format a date to relative time (e.g., "2 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
}

module.exports = {
  getFileCommits,
  formatRelativeTime
};
