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

/** === Commands === */
async function getDailyExerciseMessage(channelId) {
  const trainingExercise = velgTilfeldigØvelse(); // Existing random exercise selection
  console.log("trainingExercise: ", trainingExercise.slice(0, 20));

  // Calculate "yesterday" using the native JavaScript Date object
  const today = new Date();
  const yesterdayDate = new Date(today.setDate(today.getDate() - 1))
    .toISOString()
    .split("T")[0];
  console.log("yesterday: ", yesterdayDate);

  const filePath = path.join(insightsDir, `${channelId}.json`);
  console.log("filePath: ", filePath);

  let message = trainingExercise;
  console.log("initial message: ", message);

  if (fs.existsSync(filePath)) {
    console.log("file exists");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log("data: ", data);
    if (data[yesterdayDate] && data[yesterdayDate].winner) {
      console.log("data[yesterdayDate].winner: ", data[yesterdayDate].winner);
      const winner = Object.keys(data[yesterdayDate].winner)[0];
      const reps = data[yesterdayDate].winner[winner];
      message = `Gårsdagens vinner: <@${winner}> med ${reps} repetisjoner!\n\n${message}`;
    }
  }
  console.log("final message: ", message);
  return message;
}

// send messages & read replies and answer
async function sendExcerciseMessage(slackClient, channelId) {
  console.log("Sending excercise message to channel: ", channelId);
  try {
    const dailyExerciseMessage = await getDailyExerciseMessage(channelId);
    console.log("dailyExerciseMessage: ", dailyExerciseMessage);
    const result = await sendMessage(
      slackClient,
      channelId,
      dailyExerciseMessage
    );
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
    ConsoleLogError("trainingExercise", error, channelId);
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
    `${45} ${15} * * 1-5`,
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
    `${46} ${15} * * 1-5`,
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

  cron.schedule(
    `${47} ${15} * * 1-5`,
    async () => {
      console.log("Calculating and updating yesterday's winners");
      calculateAndUpdateWinners();
    },
    {
      timezone: "Europe/Oslo",
    }
  );

  cron.schedule(
    `${48} ${15} * * 1-5`,
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
    cron.schedule("*/55 * * * * *", () => removeBotFromChannel(slackClient), {
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

export function calculateAndUpdateWinners() {
  console.log("==== calculateAndUpdateWinners ====");
  try {
    // Correctly read the activeChannels.json file
    const activeChannels = JSON.parse(
      fs.readFileSync(activeChannelsFile, "utf8")
    );
    console.log("activeChannels: ", activeChannels);

    // Assuming you want to keep using the date-fns library for date manipulation
    // If not, you'll need to replace the following line with the native JavaScript date manipulation as before
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0];
    console.log("yesterday: ", yesterday);

    activeChannels.forEach((channelId) => {
      const filePath = path.join(insightsDir, `${channelId}.json`);
      console.log("filePath: ", filePath);
      if (fs.existsSync(filePath)) {
        console.log("file exists");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log("data: ", data);

        if (data[yesterday]) {
          console.log("data[yesterday]: ", data[yesterday]);
          const dayData = data[yesterday];
          const winner = Object.keys(dayData).reduce((acc, userId) => {
            return !acc || dayData[userId] > dayData[acc] ? userId : acc;
          }, null);
          console.log("winner: ", winner);

          if (winner) {
            data[yesterday].winner = { [winner]: dayData[winner] };
            console.log("dayData: ", dayData[winner]);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in calculateAndUpdateWinners: ", error);
  }
}
