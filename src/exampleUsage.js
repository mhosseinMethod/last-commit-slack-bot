/**
 * Example Usage for Dev 1 Integration
 *
 * This file shows how to use the getFileCommits function
 * in the Slack bot integration
 */

const { getFileCommits, formatRelativeTime } = require('./fileHistory');

// Example 1: Basic usage
async function example1() {
  const result = await getFileCommits(
    'owner/repo',           // Repository name
    'src/index.js',         // File path
    5,                      // Number of commits
    process.env.GITHUB_TOKEN // GitHub token
  );

  if (result.success) {
    console.log('✅ Success!');
    console.log('File:', result.file);
    console.log('Found', result.commits.length, 'commits');

    // Loop through commits
    result.commits.forEach(commit => {
      console.log(`- [${commit.hash}] ${commit.message}`);
      console.log(`  by ${commit.author} (${formatRelativeTime(commit.date)})`);
      console.log(`  ${commit.url}`);
    });
  } else {
    console.log('❌ Error:', result.error);
  }
}

// Example 2: Integration with Slack command handler
async function handleFileHistoryCommand(repoName, filePath, githubToken) {
  // Get the commits
  const result = await getFileCommits(repoName, filePath, 5, githubToken);

  if (!result.success) {
    // Return error to Slack formatter (Dev 4)
    return {
      success: false,
      error: result.error
    };
  }

  // Return data to Slack formatter (Dev 4)
  return {
    success: true,
    file: result.file,
    commits: result.commits.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      date: commit.date,
      relativeTime: formatRelativeTime(commit.date),
      url: commit.url
    }))
  };
}

// Example 3: Return structure for Dev 1
/*
SUCCESS RESPONSE:
{
  success: true,
  commits: [
    {
      hash: "a1b2c3d",           // Short 7-char hash
      fullHash: "a1b2c3d...",    // Full commit hash
      message: "Fix bug in parser",
      author: "John Doe",
      email: "john@example.com",
      date: "2025-10-03T10:30:00Z",
      url: "https://github.com/owner/repo/commit/..."
    },
    // ... more commits
  ],
  file: "src/index.js",
  error: null
}

ERROR RESPONSE:
{
  success: false,
  commits: [],
  file: "src/index.js",
  error: "Repository not found" // or other error message
}
*/

// Export for Dev 1 to use
module.exports = {
  handleFileHistoryCommand
};
