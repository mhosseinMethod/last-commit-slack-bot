require("dotenv").config();
const express = require("express");
const { WebClient } = require("@slack/web-api");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies (optional, for APIs)
app.use(express.json());

// Parse URL-encoded bodies (required for Slack slash commands)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON
app.use(express.json());

// Replace with your Bot User OAuth Token from Slack App
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);

app.post("/slack/commands", async (req, res) => {
  //   const { command, text, user_id, channel_id } = req.body;
  const { command, text, user_id, channel_id, response_url } = req.body;

  if (command === "/history") {
    // text could be "repo1 repo2 repo3"
    const repoNames = text ? text.split(/\s+/) : [];

    if (repoNames.length === 0) {
      return res.send("Please provide at least one repository name.");
    }

    // For now, just respond with the parsed repo names
    const responseText = `You requested history for: ${repoNames.join(", ")}`;

    res.send(responseText);

    // await slackClient.chat.postMessage({
    //   channel: channel_id,
    //   text: `Hi <@${user_id}>, fetching history for: ${repoNames.join(", ")}`,
    // });
    await axios.post(response_url, {
      text: `Hi <@${user_id}>, fetching history for: ${repoNames.join(", ")}`,
      response_type: "in_channel",
    });
  } else {
    res.send("Unknown command");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
