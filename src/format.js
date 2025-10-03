/**
 * Format repo history for Slack
 * @param {Object} data - {success: bool, commits: [{hash, message, author, date, url}], error: str}
 * @returns {string} - Slack markdown formatted message
 */
function formatRepoHistory(data) {
  const MAX_CHARS = 4000; // safety margin under Slack's 3000 limit
  const MAX_COMMITS = 10;

  if (!data) return "*AI Summary:* Unknown\n\n_No data provided._";
  if (!data.success) {
    const err = data.error || "Unknown error";
    return `:warning: Error: ${err}`;
  }

  const commits = (Array.isArray(data.commits) ? data.commits : []).slice(
    0,
    MAX_COMMITS
  );

  // Derive repo from first commit URL (if available)
  let repo = "";
  let repoUrl = "";
  if (commits.length > 0 && commits[0].url) {
    const m = commits[0].url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (m) {
      repo = m[1];
      repoUrl = `https://github.com/${repo}`;
    }
  }

  const lines = [];

  // Recent commits header
  lines.push(":clipboard: Recent Commits:");
  let index = 1;

  // Commit list
  for (const c of commits) {
    const hash =
      c.hash || (c.fullHash ? c.fullHash.substring(0, 7) : "unknown");
    const commitUrl = c.url || "";
    const message = (c.message || "").trim() || "(no message)";
    const author = `:bust_in_silhouette: ${c.author}`;
    const rtime = `_${c.relativeTime}_` || "";
    const aiSummary =
      (`:bulb: ${c.pr?.aiSummary}` || "").trim() || "(no AI summary)";

    // Line 1: clickable hash (links to commitUrl) then " - message"
    const hashDisplay = `*${hash}* (${commitUrl})`;
    lines.push(`${index++}. ${hashDisplay} - ${message}`);

    // Line 2: author • relativeTime
    const metaParts = [author];
    if (rtime) metaParts.push(rtime);
    lines.push(metaParts.join(" • "));

    // Line 3: AI summary for the commit
    lines.push(aiSummary);

    // blank spacer
    lines.push(`\n`);

    // Safety: stop early if close to limit
    const currentLen = lines.reduce((acc, l) => acc + l.length + 1, 0); // +1 for newline
    if (currentLen > MAX_CHARS - 200) {
      lines.push("… (output truncated due to length)");
      break;
    }
  }

  let result = lines.join("\n").trim();

  // Final truncate if still too long
  if (result.length > MAX_CHARS) {
    result = result.slice(0, MAX_CHARS - 12).trimEnd() + "\n\n...(truncated)";
  }

  return result;
}

/**
 * Format file history for Slack
 * @param {Object} data - {success: bool, file: str, commits: [{hash, message, author, date, url, relativeTime}], error: str}
 * @param {string} repoName - Repository name (e.g., "methodcrm/repo-name")
 * @returns {string} - Slack markdown formatted message
 */
function formatFileHistory(data, repoName = "") {
  if (!data) return "📁 *File History:* Unknown\n\n_No data provided._";
  if (!data.success) {
    const err = data.error || "Unknown error";
    return `❌ Error: ${err}`;
  }

  const fileName = data.file || "unknown file";
  let message = `📁 *lol File History for \`${fileName}\``;

  if (repoName) {
    message += ` in \`${repoName}\``;
  }

  message += `*\n\n`;

  const commits = Array.isArray(data.commits) ? data.commits : [];

  if (commits.length === 0) {
    message += "No commits found for this file.";
    return message;
  }

  commits.forEach((commit, index) => {
    const hash = commit.hash || "unknown";
    const commitMessage = (commit.message || "").trim() || "(no message)";
    const author = commit.author || "Unknown";
    const relativeTime = commit.relativeTime || "";
    const url = commit.url || "";

    message += `${index + 1}. *${hash}* - ${commitMessage}\n`;
    message += `   👤 ${author}`;
    if (relativeTime) {
      message += ` • ${relativeTime}`;
    }
    message += `\n`;
    if (url) {
      message += `   🔗 ${url}\n`;
    }
    message += `\n`;
  });

  // Truncate if needed (Slack limit is 3000 chars)
  if (message.length > 3000) {
    message = message.slice(0, 2997) + "...";
  }

  return message;
}

module.exports = {
  formatRepoHistory,
  formatFileHistory,
};
