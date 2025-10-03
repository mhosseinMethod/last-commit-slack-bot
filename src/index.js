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

    // /history repo-name - Get repository commit history
    if (command === "/history") {
      const args = text ? text.trim().split(/\s+/) : [];

      if (args.length < 1) {
        return res.send("Usage: /history repo-name\nExample: /history runtime-core");
      }

      const repoInput = args[0];

      // Immediate response
      res.send(`Fetching last 5 commits for methodcrm/${repoInput}...`);

      try {
        const result = await getRepoCommits(repoInput, 5, "master");

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
    // /filehistory repo-name file-path - Get file commit history
    else if (command === "/filehistory") {
      const args = text ? text.trim().split(/\s+/) : [];

      if (args.length < 2) {
        return res.send(
          "Usage: /filehistory repo-name path/to/file\nExample: /filehistory runtime-core src/index.js"
        );
      }

      const repoInput = args[0];
      const filePath = args.slice(1).join(" "); // Handle file paths with spaces
      const repoNameWithOrg = `methodcrm/${repoInput}`;

      // Immediate response
      res.send(`Fetching history for ${filePath} in ${repoNameWithOrg}...`);

      try {
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
      res.send("Unknown command. Available commands: /history, /filehistory");
    }
  } catch (err) {
    console.error("Error handling slash command:", err.message);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
