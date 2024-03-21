import { createEventAdapter } from "@slack/events-api";
import { WebClient } from "@slack/web-api";
import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import {
  findTopPerformers,
  summarizeMonthly,
  summarizeToday,
} from "./channelUtils.js";
import {
  ConsoleLogError,
  UpdateUserInfo,
  activeChannelsDir,
  activeChannelsFile,
  getActiveChannels,
  initializeDirectoriesAndFiles,
  insightsDir,
  removeBotFromChannels,
  scheduleMessages,
  sendMessage,
  userInfoDir,
} from "./helpers.js";
import { validateToken } from "./utils.js";

import { updateStatsForThread } from "./stats.js";

import { config } from "./config.js";
process.env.TZ = "Europe/Oslo";

// initialize directories and files
// activeChannelsFile, blockedFoodsFilePrefix
initializeDirectoriesAndFiles();

// Express app configurations
const app = express();
const PORT_SERVER = 4000;

// slack confs
const {
  SLACK_SIGNIN_SECRET_SPB1,
  SLACK_BOT_TOKEN_SPB1,
  SLACK_BOT_USER_ID_SPB1,
} = config; // npr appen skal kjøre på SPB1U
// const slackClient = new WebClient(SLACK_BOT_TOKEN);
const slackClient = new WebClient(SLACK_BOT_TOKEN_SPB1);
// const slackEvents = createEventAdapter(SLACK_SIGNIN_SECRET);
const slackEvents = createEventAdapter(SLACK_SIGNIN_SECRET_SPB1);

// Schedule messages
scheduleMessages(slackClient);

// Remove today's blocked food
removeBotFromChannels(slackClient); // remember to add this

UpdateUserInfo(slackClient);

// Express and Slack event configurations
app.use(cors());
app.use("/slack-events", slackEvents.expressMiddleware());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

slackEvents.on("message", async (event) => {
  const isBot = event.user === SLACK_BOT_USER_ID_SPB1; // todo: bytt til SPB1

  /*  == Handle replies in conversation == */
  if (
    event.type === "message" &&
    event.thread_ts &&
    event.thread_ts !== event.ts &&
    !isBot
  ) {
    console.log("Received a reply in a thread:");

    const channelId = event.channel;
    const userId = event.user;
    const threadTimestamp = event.thread_ts;
    const repetitions = parseInt(event.text, 10); // Extracting the number of repetitions from the message text

    // Convert thread timestamp to date string
    const threadDate = new Date(parseFloat(threadTimestamp) * 1000)
      .toISOString()
      .split("T")[0];
    // Get today's date string
    const todayDate = new Date().toISOString().split("T")[0];

    if (!isNaN(repetitions) && threadDate === todayDate) {
      updateStatsForThread(channelId, threadTimestamp, userId, repetitions);
    } else {
      await slackClient.chat
        .postMessage({
          channel: channelId,
          text: "Ditt svar er notert, men vil ikke bli telt med siden det ble sendt inn for sent.",
          thread_ts: threadTimestamp,
        })
        .catch(console.error);
    }
  }
});

slackEvents.on("member_joined_channel", async (event) => {
  // Check if the member joined is the bot itself
  const isBot = event.user === SLACK_BOT_USER_ID_SPB1; // todo: bytt til SPB1
  console.log("isBot: ", isBot);
  if (isBot) {
    console.log("Bot joined channel: ", event.channel);
    try {
      // Update active channels
      const activeChannels = getActiveChannels();
      console.log("activeChannels: ", activeChannels);
      if (!activeChannels.includes(event.channel)) {
        console.log("adding channel to file:", event.channel);
        activeChannels.push(event.channel);
        fs.writeFileSync(activeChannelsFile, JSON.stringify(activeChannels));
      }

      // Create an empty file for last message timestamp for this channel
      const channelTimestampFilePath = path.join(
        activeChannelsDir,
        `${event.channel}.json`
      );
      if (!fs.existsSync(channelTimestampFilePath)) {
        fs.writeFileSync(
          channelTimestampFilePath,
          JSON.stringify({ lastMessageTimestamp: null })
        );
      }

      await sendMessage(
        slackClient,
        event.channel, // Use the channel ID from the event
        "Hei! Jeg heter *Treningsboten*! :tada:\n\nHer kan du forvente daglige treningsøvelser som skal gjennomføres. \n\nFor hver post skal det svares i tråden :thread: hvor mange repetisjoner du klarte.\n\nDet vil komme en oppsummering i løpet av uka, kanskje også underveis i uka om noen står skikkelig på."
      );
    } catch (error) {
      ConsoleLogError("Slack events | member_joined_channel | isBot", error);
    }
  } else {
    const displayName = event.user;
    try {
      // Send a welcome message to the channel
      await sendMessage(
        slackClient,
        event.channel, // Use the channel ID from the event
        "Hei! Velkommen til *Treningsboten*! :tada:\nHer kan du forvente daglige treningsøvelser som skal gjennomføres. \nFor hver post, skal det svares i tråden :thread: hvor mange repetisjoner du klarte.\nDet vil komme en oppsummering i løpet av uka, kanskje også underveis i uka om noen står skikkelig på."
      );
    } catch (error) {
      ConsoleLogError(
        "Slack events | member_joined_channel | !isUserSlackBot",
        error
      );
    }
  }
});

slackEvents.on("error", (error) => {
  console.log("Error: ", error);
});

// Slack app routes
app.post("/api/slack-events", (req, res) => {
  console.log("=== incoming events ===", req.body.type);
  if (req.body.type === "url_verification") {
    return res.send(req.body.challenge);
  }

  console.log("\n\nreq.body: ", req.body);
  // Event listener for 'message.thread_broadcast'
  try {
    if (
      req.body.event &&
      req.body.event.type === "message" &&
      req.body.event.thread_ts
    ) {
      console.log("\n\nBroadcast message received", req.body.event);
      const { channel, thread_ts, user, text } = req.body.event;

      // Retrieve the number of repetitions from the text, assuming it's an integer
      const repetitions = parseInt(text, 10);
      if (!isNaN(repetitions)) {
        updateStatsForThread(channel, thread_ts, user, repetitions);
      }
    }
  } catch (error) {
    ConsoleLogError("Slack events | message.thread_broadcast", error);
  }
  res.sendStatus(200);
});

// Node.js app routes
app.get("/api", (request, response) => {
  console.log('Path "/ Api" works ✅🚀');

  try {
    const htmlContent = `
        <html>
          <head>
            <title>Treningsboten API</title>
            <description>API for treningsboten.com</description>
            <style>
              body {
                background-color: black;
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
              }
              p {
                max-width: 600px;
                text-wrap: balance;
                margin: 0 auto;
                padding-top: 6rem;
              }

              a {
                color: #00b7ff;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>Welcome to Treningsboten API! 🚀✅💥</h1>
            <p>This site is a web API for <a href="https://treningsboten.com">treningsboten.com</a></p>
            <p>For more information, visit the <a href="https://treningsboten.com">treningsboten.com</a> website, or contact me personally by visiting my personal website at <a href="https://stianlarsen.com">stianlarsen.com</a></p>
          </body>
        </html>
      `;
    response.status(200).send(htmlContent);
  } catch (err) {
    console.error("Error: ", err);
    response.status(500).send("Something broke!");
  }
});

app.get("/api/channel", async (req, res) => {
  const { channelId, token } = req.query;

  // Example validation (you should replace this with your actual validation logic)
  if (!validateToken(token)) {
    return res.status(403).send("Unauthorized");
  }

  const insightsFilePath = path.join(insightsDir, `${channelId}.json`);
  const userInfoFilePath = path.join(userInfoDir, `${channelId}.json`);

  if (fs.existsSync(insightsFilePath)) {
    const insightsData = await JSON.parse(
      fs.readFileSync(insightsFilePath, "utf8")
    );
    const userInfoData = await JSON.parse(
      fs.readFileSync(userInfoFilePath, "utf8")
    );

    const scoreToday = await summarizeToday(insightsData, userInfoData);
    const monthlySummary = await summarizeMonthly(insightsData, userInfoData);
    const topPerformersAllTime = await findTopPerformers(
      insightsData,
      userInfoData
    );

    const channelInsights = {
      monthlySummary: monthlySummary,
      topPerformersAllTime: topPerformersAllTime,
      usersInfo: userInfoData,
      scoreToday: scoreToday,
    };

    console.log(JSON.stringify(channelInsights));

    res.json(channelInsights);
  } else {
    res.status(404).send("Channel data not found");
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error("An error occurred: \n", err.stack);
  res.status(500).send("Something broke!");
});

// Node.js server START
app.listen(PORT_SERVER, () => {
  console.log("Firing up treningsboten server..");
  console.log(`Server listening on port ${PORT_SERVER}`);
});
