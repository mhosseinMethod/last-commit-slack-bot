require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Summarize a single PR's Copilot overview
 * @param {string} copilotOverview - The Copilot overview text
 * @param {string} prTitle - The PR title for context
 * @returns {Promise<string>} - Brief AI summary
 */
async function summarizePR(copilotOverview, prTitle) {
  if (!copilotOverview) return null;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a code review assistant. Summarize pull request changes in 1-2 concise sentences. Focus on WHAT changed and WHY.'
        },
        {
          role: 'user',
          content: `PR Title: ${prTitle}\n\nCopilot Overview:\n${copilotOverview}\n\nProvide a brief 1-2 sentence summary.`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI Summary Error]', error.message);
    return null;
  }
}

/**
 * Generate an overall summary for all commits
 * @param {Array} commits - Array of commit objects with PR info
 * @returns {Promise<string>} - Overall summary of recent changes
 */
async function summarizeRepoActivity(commits) {
  if (!commits || commits.length === 0) return null;

  try {
    // Build a summary of all commits
    const commitSummary = commits.map((c, i) => {
      const prInfo = c.pr ? `(PR #${c.pr.number}: ${c.pr.title})` : '';
      return `${i + 1}. ${c.message} ${prInfo}`;
    }).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a repository activity summarizer. Analyze recent commits and provide a brief 2-3 sentence overview of the recent development activity. Focus on themes, patterns, and overall direction.'
        },
        {
          role: 'user',
          content: `Recent commits:\n\n${commitSummary}\n\nProvide a 2-3 sentence summary of recent repository activity.`
        }
      ],
      max_tokens: 150,
      temperature: 0.4
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI Summary Error]', error.message);
    return null;
  }
}

module.exports = {
  summarizePR,
  summarizeRepoActivity
};
