require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { getFileCommits, formatRelativeTime } = require("./fileHistory");
const { getRepoCommits } = require("./repo-history/repoHistory");
const { formatRepoHistory, formatFileHistory } = require("./format");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/slack/commands", async (req, res) => {
  try {
    const { command, text, user_id, response_url } = req.body;

    console.log("Received command:", command);

    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return res.send("❌ Error: GITHUB_TOKEN not configured.");
    }

    // /help - Show available commands
    if (command === "/help") {
      const helpMessage = `
📚 *Available Commands*

*1. /history* - Get repository commit history
   Usage: \`/history repo-name [branch-name]\`
   Examples:
   • \`/history runtime-core\` - Get last 5 commits from master branch
   • \`/history runtime-core develop\` - Get last 5 commits from develop branch
   Returns: Last 5 commits with PR info and AI summaries

*2. /filehistory* - Get file commit history
   Usage: \`/filehistory repo-name path/to/file [branch-name]\`
   Examples:
   • \`/filehistory runtime-core src/index.js\` - Get file history from master
   • \`/filehistory runtime-core src/index.js develop\` - Get file history from develop branch
   Returns: Last 5 commits for the specific file

*3. /help* - Show this help message

📝 *Notes:*
• All repositories are prefixed with \`methodcrm/\` automatically
• Branch name defaults to \`master\` if not specified
      `.trim();

      return res.send(helpMessage);
    }
    // /history repo-name [branch-name] - Get repository commit history
    else if (command === "/history") {
      const args = text ? text.trim().split(/\s+/) : [];

      if (args.length < 1) {
        return res.send("Usage: /history repo-name [branch-name]\nExample: /history runtime-core\nExample: /history runtime-core develop");
      }

      const repoInput = args[0];
      const branchName = args[1] || "master"; // Optional branch parameter

      // Immediate response
      res.send(`Fetching last 5 commits for methodcrm/${repoInput} from ${branchName}...`);

      try {
        const result = await getRepoCommits(repoInput, branchName);

        if (!result.success) {
          await axios.post(response_url, {
            text: `❌ Error: ${result.message || "Failed to fetch repo history"}`,
            response_type: "in_channel",
          });
          return;
        }

        const message = formatRepoHistory(result);

        await axios.post(response_url, {
          text: message,
          response_type: "in_channel",
        });
      } catch (err) {
        console.error("Error processing /history command:", err.message);
        await axios.post(response_url, {
          text: `❌ Error: ${err.message}`,
          response_type: "in_channel",
        });
      }
    }
    // /filehistory repo-name file-path [branch-name] - Get file commit history
    else if (command === "/filehistory") {
      const args = text ? text.trim().split(/\s+/) : [];

      if (args.length < 2) {
        return res.send(
          "Usage: /filehistory repo-name path/to/file [branch-name]\nExample: /filehistory runtime-core src/index.js\nExample: /filehistory runtime-core src/index.js develop"
        );
      }

      const repoInput = args[0];

      // Check if last arg is a branch name (doesn't contain / or .)
      const lastArg = args[args.length - 1];
      const isBranch = !lastArg.includes('/') && !lastArg.includes('.');

      let filePath;
      let branchName = "master";

      if (isBranch && args.length > 2) {
        // Last arg is branch name
        filePath = args.slice(1, -1).join(" ");
        branchName = lastArg;
      } else {
        // No branch specified, all args after repo are file path
        filePath = args.slice(1).join(" ");
      }

      const repoNameWithOrg = `methodcrm/${repoInput}`;

      // Immediate response
      res.send(`Fetching history for ${filePath} in ${repoNameWithOrg} from ${branchName}...`);

      try {
        const result = await getFileCommits(
          repoNameWithOrg,
          filePath,
          githubToken,
          branchName
        );

        if (!result.success) {
          await axios.post(response_url, {
            text: `❌ Error: ${result.error}`,
            response_type: "in_channel",
          });
          return;
        }

        const message = formatFileHistory(result, repoNameWithOrg);

        await axios.post(response_url, {
          text: message,
          response_type: "in_channel",
        });
      } catch (err) {
        console.error("Error processing /filehistory command:", err.message);
        await axios.post(response_url, {
          text: `❌ Error: ${err.message}`,
          response_type: "in_channel",
        });
      }
    } else {
      res.send("Unknown command. Available commands: /history, /filehistory, /help\nType /help for more information.");
    }
  } catch (err) {
    console.error("Error handling slash command:", err.message);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
