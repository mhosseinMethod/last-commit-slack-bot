require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/slack/commands", async (req, res) => {
  try {
    const { command, text, user_id, response_url } = req.body;

    console.log('in the command');

    if (command === "/history") {
      const repoNames = text ? text.split(/\s+/) : [];

      if (repoNames.length === 0) {
        return res.send("Please provide at least one repository name.");
      }

      // Immediate response to Slack
      const responseText = `You requested history for: ${repoNames.join(", ")}`;
      res.send(responseText);

      // Async message to channel or user
      try {
        await axios.post(response_url, {
          text: `Hi <@${user_id}>, fetching history for: ${repoNames.join(
            ", "
          )}`,
          response_type: "in_channel",
        });
      } catch (err) {
        console.error("Error sending async message to Slack:", err.message);
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
