require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { getFileCommits, formatRelativeTime } = require("./fileHistory");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/slack/commands", async (req, res) => {
  try {
    const { command, text, user_id, response_url } = req.body;

    console.log('in the command');

    if (command === "/history") {
      const args = text ? text.trim().split(/\s+/) : [];

      // Expect format: /history owner/repo path/to/file.js
      if (args.length < 2) {
        return res.send("Usage: /history owner/repo path/to/file.js");
      }

      const repoName = args[0];
      const filePath = args.slice(1).join(" "); // Handle file paths with spaces

      // Immediate response to Slack (must respond within 3 seconds)
      res.send(`Fetching history for ${filePath} in ${repoName}...`);

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

        // Call Dev 3's function
        const result = await getFileCommits(repoName, filePath, 5, githubToken);

        if (!result.success) {
          await axios.post(response_url, {
            text: `❌ Error: ${result.error}`,
            response_type: "in_channel",
          });
          return;
        }

        // Format the response (Dev 4 will improve this later)
        let message = `📁 *File History for \`${result.file}\` in \`${repoName}\`*\n\n`;

        if (result.commits.length === 0) {
          message += "No commits found for this file.";
        } else {
          result.commits.forEach((commit, index) => {
            message += `${index + 1}. *${commit.hash}* - ${commit.message}\n`;
            message += `   👤 ${commit.author} • ${formatRelativeTime(commit.date)}\n`;
            message += `   🔗 ${commit.url}\n\n`;
          });
        }

        await axios.post(response_url, {
          text: message,
          response_type: "in_channel",
        });

      } catch (err) {
        console.error("Error processing file history:", err.message);
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
