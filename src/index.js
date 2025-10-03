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

    console.log("in the command");

    if (command === "/history") {
      const args = text ? text.trim().split(/\s+/) : [];

      // Check if we have at least a repo name
      if (args.length < 1) {
        return res.send(
          "Usage: /history repo-name [path/to/file.js]\nProvide just repo-name for repo history, or add file path for file history."
        );
      }

      const repoInput = args[0];

      // Auto-prepend methodcrm/ if not already included
      const repoNameWithOrg = repoInput.includes("/")
        ? repoInput
        : `methodcrm/${repoInput}`;

      // Async processing
      try {
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
          await axios.post(response_url, {
            text: `❌ Error: GITHUB_TOKEN not configured.`,
            response_type: "in_channel",
          });
          return;
        }

        // CASE 1: Only repo name provided -> Repo history (last 5 commits)
        if (args.length === 1) {
          // Immediate response
          res.send(`Fetching last 5 commits for ${repoNameWithOrg}...`);

          // Get repo history (Dev 2's function)
          const result = await getRepoCommits(repoInput, 5, "master");

          if (!result.success) {
            await axios.post(response_url, {
              text: `❌ Error: ${
                result.message || "Failed to fetch repo history"
              }`,
              response_type: "in_channel",
            });
            return;
          }

          // Format using Dev 4's formatter
          const message = formatRepoHistory(result);

          await axios.post(response_url, {
            text: message,
            response_type: "in_channel",
          });
        }
        // CASE 2: Repo name + file path -> File history
        else {
          const filePath = args.slice(1).join(" "); // Handle file paths with spaces

          // Immediate response
          res.send(`Fetching history for ${filePath} in ${repoNameWithOrg}...`);

          // Call Dev 3's function
          const result = await getFileCommits(
            repoNameWithOrg,
            filePath,
            5,
            githubToken
          );

          if (!result.success) {
            await axios.post(response_url, {
              text: `❌ Error: ${result.error}`,
              response_type: "in_channel",
            });
            return;
          }

          // Format the response
          // let message = `📁 *File History for \`${result.file}\` in \`${repoNameWithOrg}\`*\n\n`;

          // if (result.commits.length === 0) {
          //   message += "No commits found for this file.";
          // } else {
          //   result.commits.forEach((commit, index) => {
          //     message += `${index + 1}. *${commit.hash}* - ${commit.message}\n`;
          //     message += `   👤 ${commit.author} • ${formatRelativeTime(commit.date)}\n`;
          //     message += `   🔗 ${commit.url}\n\n`;
          //   });
          // }

          const message = formatFileHistory(result, repoNameWithOrg);

          await axios.post(response_url, {
            text: message,
            response_type: "in_channel",
          });
        }
      } catch (err) {
        console.error("Error processing history command:", err.message);
        await axios.post(response_url, {
          text: `❌ Error: ${err.message}`,
          response_type: "in_channel",
        });
      }
    } else {
      res.send("Unknown command");
    }
  } catch (err) {
    console.error("Error handling slash command:", err.message);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
