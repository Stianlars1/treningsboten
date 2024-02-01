import fs from "fs";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import { getNoonStatsMessage } from "./stats.js";
import { treningsØvelser } from "./treningsØvelser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
export const activeChannelsDir = path.join(dataDir, "activeChannels");
export const insightsDir = path.join(dataDir, "insights");
export const activeChannelsFile = path.join(
  activeChannelsDir,
  "activeChannels.json"
);

// Create directories and files if they don't exist
export function initializeDirectoriesAndFiles() {
  [dataDir, activeChannelsDir, insightsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });

  if (!fs.existsSync(activeChannelsFile)) {
    fs.writeFileSync(activeChannelsFile, JSON.stringify([]));
  }
}

export async function sendMessage(slackClient, channel, message) {
  try {
    const result = await slackClient.chat.postMessage({
      channel: channel,
      text: message,
    });
    return result;
  } catch (error) {
    ConsoleLogError("sendMessage", error);
    return false;
  }
}

export function velgTilfeldigØvelse() {
  return treningsØvelser[Math.floor(Math.random() * treningsØvelser.length)];
}

function saveTimestampToFile(channelId, timestamp) {
  const filePath = path.join(activeChannelsDir, `${channelId}.json`);
  const date = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format

  try {
    // Read the existing data if the file exists or start with an empty object
    let channelData = {};
    if (fs.existsSync(filePath)) {
      channelData = JSON.parse(fs.readFileSync(filePath));
    }

    // If 'threads' key does not exist, initialize it
    if (!channelData.threads) {
      channelData.threads = {};
    }

    // Add or update the thread timestamp for the current date
    channelData.threads[date] = timestamp;

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(channelData, null, 2)); // null, 2 for pretty-print format

    console.log(`Timestamp saved for channel ${channelId} on ${date}`);
  } catch (error) {
    console.error("Error in saveTimestampToFile:", error);
  }
}

export async function velgTilfeldigLunsjSvar(channel_id, randomSuggestion) {
  // Fjern alle spørsmålstegn fra brukerens forslag
  console.log(
    "velger tilfeldig lunsj svar med input tekst: ",
    randomSuggestion
  );
  if (typeof randomSuggestion !== "string") {
    return "Ugyldig tekst";
  }
  let chatGPTresponse;
  try {
    if (channel_id === OVERSIKT_LUNSJ_CHANNEL) {
      console.log(
        "Team Oversikt entered the building! Let's use the private function of Chat GPT-4 shall we?"
      );
      chatGPTresponse = await analyzeWithGPT4(randomSuggestion);
    }
  } catch (error) {
    console.log(
      "error using gpt for oversikt, with gpt response: ",
      chatGPTresponse
    );
  }
  const cleanedSuggestion =
    chatGPTresponse && chatGPTresponse.length > 0
      ? chatGPTresponse
      : randomSuggestion.replace(/\?/g, "");

  const tilfeldigIndeks = Math.floor(Math.random() * lunsjSvar.length);
  const emoji = finnEmojiForMatrett(cleanedSuggestion);
  const lunsjSvaret =
    lunsjSvar[tilfeldigIndeks].replace("{valg}", cleanedSuggestion) + emoji;

  return lunsjSvaret;
}

export function loadTimestampFromFile(channelId) {
  try {
    const filePath = path.join(activeChannelsDir, `${channelId}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return data.lastMessageTimestamp;
    }
  } catch (error) {
    ConsoleLogError("loadTimestampFromFile", error);
  }
  return null;
}

/** === Svar === */

export function finnEmojiForMatrett(randomSuggestion) {
  const matrett = randomSuggestion.toLowerCase();

  if (
    [
      "burger",
      "hamburger",
      "cheeseburger",
      "bastard",
      "mc",
      "mcdonalds",
      "burger king",
      "max",
    ].some((item) => matrett.includes(item))
  ) {
    return "🍔";
  }
  if (
    ["pizza", "digg pizza", "zz", "pizzabakeren", "dominos"].some((item) =>
      matrett.includes(item)
    )
  ) {
    return "🍕";
  }
  if (
    ["sushi", "sushibar", "sushibar og grill"].some((item) =>
      matrett.includes(item)
    )
  ) {
    return "🍣";
  }
  if (
    [
      "baguett",
      "baguette",
      "baguetteria",
      "baggis",
      "bæggis",
      "thai baguett",
      "thai-baguette",
      "baguet",
    ].some((item) => matrett.includes(item))
  ) {
    return "🥖";
  }
  if (["kebab", "kebabrull"].some((item) => matrett.includes(item))) {
    return "🥙";
  }
  if (
    ["taco", "tacofredag", "burito", "burrito", "burritos"].some((item) =>
      matrett.includes(item)
    )
  ) {
    return "🌮";
  }
  if (matrett.includes("pasta")) {
    return "🍝";
  }

  // Legg til flere matretter og deres emojis her

  return ""; // Ingen matchende emoji funnet
}

/** === Commands === */

export function genererTilfeldigForslag() {
  const tilfeldigIndeks = Math.floor(Math.random() * matForslag.length);
  return matForslag[tilfeldigIndeks];
}

export async function sendTidForLunsjMelding(slackClient, channelId) {
  console.log("Sending its time for lunch message to channel: ", channelId);
  try {
    const message = velgTilfeldigTidForLunsjHilsen();
    await sendMessage(slackClient, channelId, message);
  } catch (error) {
    ConsoleLogError("sendTidForLunsjMelding | error:\n", error);
  }
}

export function velgTilfeldigTidForLunsjHilsen() {
  return tidForLunsjMeldinger[
    Math.floor(Math.random() * tidForLunsjMeldinger.length)
  ];
}

// send messages & read replies and answer
async function sendExcerciseMessage(slackClient, channelId) {
  console.log("Sending excercise message to channel: ", channelId);
  try {
    const trainingExcercise = velgTilfeldigØvelse();

    const result = await sendMessage(slackClient, channelId, trainingExcercise);
    if (result) {
      console.log("Message sent successfully for channel: ", channelId);
      saveTimestampToFile(channelId, result.ts);
    } else {
      console.log(
        "Message not sent for channel: ",
        channelId,
        " with result: ",
        result
      );
    }
  } catch (error) {
    ConsoleLogError("sendLunchMessage", error, channelId);
  }
}

// send stats message at noon
async function sendNoonMessage(slackClient, channelId) {
  //  <@${event.user}> to tag the user
  try {
    const noonStatsMessage = await getNoonStatsMessage(channelId);
    const result = await sendMessage(slackClient, channelId, noonStatsMessage);
  } catch (error) {
    ConsoleLogError("sendLunchMessage", error, channelId);
  }
}

export function scheduleMessages(slackClient) {
  // Schedule message sending every day at 10:00 AM
  cron.schedule(
    "*/40 * * * * *",
    // `${0} ${10} * * 1-5`,
    async () => {
      try {
        const activeChannels = getActiveChannels();
        if (activeChannels.length === 0) {
          console.log("No active channels!");
          return;
        }
        activeChannels.forEach((channelId) => {
          sendExcerciseMessage(slackClient, channelId);
        });
      } catch (error) {
        ConsoleLogError("scheduleMessages { 10:00 } catch error: ", error);
      }
    },
    {
      timezone: "Europe/Oslo",
    }
  );
  cron.schedule(
    "*/30 * * * * *",
    // `${0} ${10} * * 1-5`,
    async () => {
      try {
        const activeChannels = getActiveChannels();
        if (activeChannels.length === 0) {
          console.log("No active channels!");
          return;
        }
        activeChannels.forEach((channelId) => {
          sendNoonMessage(slackClient, channelId);
        });
      } catch (error) {
        ConsoleLogError("scheduleMessages { 10:00 } catch error: ", error);
      }
    },
    {
      timezone: "Europe/Oslo",
    }
  );
}

export function ConsoleLogError(functionName, error) {
  return console.error(
    `Error occured in/on ${functionName}\nWith error: `,
    error
  );
}

// Function to get active channels
export function getActiveChannels() {
  try {
    if (fs.existsSync(activeChannelsFile)) {
      return JSON.parse(fs.readFileSync(activeChannelsFile, "utf8"));
    }
    return [];
  } catch (error) {
    ConsoleLogError("getActiveChannels", error);
    return [];
  }
}

// Function to add a channel to the active channels list
export function addActiveChannel(channelId) {
  try {
    const activeChannels = getActiveChannels();
    if (!activeChannels.includes(channelId)) {
      activeChannels.push(channelId);
      fs.writeFileSync(activeChannelsFile, JSON.stringify(activeChannels));
    }
  } catch (error) {
    ConsoleLogError("addActiveChannel", error);
  }
}

// Function to remove a channel from the active channels list
export function removeActiveChannel(channelId) {
  try {
    let activeChannels = getActiveChannels();
    activeChannels = activeChannels.filter((channel) => channel !== channelId);
    fs.writeFileSync(activeChannelsFile, JSON.stringify(activeChannels));
  } catch (error) {
    ConsoleLogError("removeActiveChannel", error);
  }
}

// fetch all slack channels that the bot is a member of
async function fetchSlackChannels(slackClient) {
  console.log("Fetching Slack channels...");
  const channels = [];
  let cursor;

  do {
    const response = await slackClient.conversations.list({
      types: "public_channel,private_channel",
      cursor: cursor,
    });
    console.log("response: ", response);
    response.channels.forEach((channel) => {
      if (channel.is_member) {
        console.log("pushing channel: ", channel);
        channels.push(channel.id);
      }
    });
    cursor = response.response_metadata.next_cursor;
  } while (cursor);

  return channels;
}

function deleteChannelData(channelId) {
  console.log("Deleting channel data for channel: ", channelId);
  const channelTimestampFilePath = path.join(
    activeChannelsDir,
    `${channelId}.json`
  );
  const blockedFoodsFilePath = path.join(blockedFoodsDir, `${channelId}.json`);

  try {
    if (fs.existsSync(channelTimestampFilePath)) {
      console.log("Deleting file: ", channelTimestampFilePath);
      fs.unlinkSync(channelTimestampFilePath);
    }
    if (fs.existsSync(blockedFoodsFilePath)) {
      console.log("Deleting file: ", blockedFoodsFilePath);
      fs.unlinkSync(blockedFoodsFilePath);
    }
  } catch (error) {
    ConsoleLogError("deleteChannelData", error);
  }
}

function removeFromActiveChannels(channelId) {
  console.log("Removing channel from active channels: ", channelId);
  try {
    const activeChannels = JSON.parse(fs.readFileSync(activeChannelsFile));
    const updatedChannels = activeChannels.filter((id) => id !== channelId);
    fs.writeFileSync(activeChannelsFile, JSON.stringify(updatedChannels));
  } catch (error) {
    ConsoleLogError("removeFromActiveChannels", error);
  }
}

export function removeBotFromChannels(slackClient) {
  console.log("Scheduling channel check...");
  try {
    cron.schedule(
      `${55} ${11} * * *`,
      () => removeBotFromChannel(slackClient),
      {
        timezone: "Europe/Oslo",
      }
    );
    cron.schedule(`${1} ${0} * * *`, () => removeBotFromChannel(slackClient), {
      timezone: "Europe/Oslo",
    });
    cron.schedule("*/55 * * * *", () => removeBotFromChannel(slackClient), {
      timezone: "Europe/Oslo",
    });
  } catch (error) {
    ConsoleLogError(
      `removeBotFromChannels error at timeslot: ${new Date()}`,
      error
    );
  }
}

async function removeBotFromChannel(slackClient) {
  try {
    console.log("Checking for channels to remove bot from...");
    const slackChannels = await fetchSlackChannels(slackClient); // Implement this function to use Slack's API
    const activeChannels = JSON.parse(fs.readFileSync(activeChannelsFile));
    console.log("activeChannels ", activeChannels);
    activeChannels.forEach((channelId) => {
      // Check if the bot is still a member of the channel
      if (!slackChannels.includes(channelId)) {
        // Bot is no longer a member of the channel
        // Bot is removed from the channel
        // Delete channel data
        // deleteChannelData(channelId);

        // Remove channel from active channels
        removeFromActiveChannels(channelId);
      }
    });
  } catch (error) {
    ConsoleLogError(`removeBotFromChannel at time: ${new Date()} `, error);
  }
}

async function addChannelInsight(channelId, lunchSuggestions, winner) {
  try {
    const currentDate = new Date(Date.now());
    const formattedDate = currentDate.toLocaleDateString("no-NO");
    const newInsight = {
      channel: channelId,
      suggestions: lunchSuggestions,
      winner: winner,
      timestamp: formattedDate,
    };
    const filePath = path.join(insightsDirectory, `${channelId}.json`);
    const data = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : [];
    data.push(newInsight);
    fs.writeFileSync(filePath, JSON.stringify(data));
  } catch (error) {
    ConsoleLogError("addChannelInsight", error);
  }
}

export async function removeChannel(channelId) {
  console.log("TRYING TO REMOVE CHANNEL: ", channelId);
  fs.readFile(activeChannelsFile, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading activeChannels.json:", err);
      return;
    }

    let channels = JSON.parse(data);
    const channelIndex = channels.indexOf(channelId);

    // If the channel is found, remove it
    if (channelIndex > -1) {
      channels.splice(channelIndex, 1);

      // Write the updated channels back to the file
      fs.writeFile(
        activeChannelsFile,
        JSON.stringify(channels, null, 2),
        "utf8",
        (writeErr) => {
          if (writeErr) {
            console.error("Error writing to activeChannels.json:", writeErr);
          } else {
            console.log(
              `Channel ${channelId} removed from activeChannels.json`
            );
          }
        }
      );
    }
  });
}
