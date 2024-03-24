import fs from "fs";
import moment from "moment-timezone";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchAndStoreUserInfo,
  sendFullWeekUpdate,
  sendHalfWeekUpdate,
  sendMonthlyUpdates,
} from "./cronMessages.js";
import { getNoonStatsMessage } from "./stats.js";
import { treningsØvelser } from "./treningsØvelser.js";

process.env.TZ = "Europe/Oslo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
export const activeChannelsDir = path.join(dataDir, "activeChannels");
export const insightsDir = path.join(dataDir, "insights");
export const userInfoDir = path.join(dataDir, "userInfo");
export const activeChannelsFile = path.join(
  activeChannelsDir,
  "activeChannels.json"
);

// Create directories and files if they don't exist
export function initializeDirectoriesAndFiles() {
  [dataDir, activeChannelsDir, insightsDir, userInfoDir].forEach((dir) => {
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

/** === Commands === */
async function getDailyExerciseMessage(channelId) {
  console.log("\n=== getDailyExerciseMessage ===");
  const trainingExercise = velgTilfeldigØvelse(); // Existing random exercise selection

  // Use moment-timezone to get "today" and "yesterday" in Norwegian time zone
  const today = moment.tz("Europe/Oslo").format("YYYY-MM-DD");
  const yesterdayDate = moment
    .tz("Europe/Oslo")
    .subtract(1, "days")
    .format("YYYY-MM-DD");

  const filePath = path.join(insightsDir, `${channelId}.json`);
  let message = trainingExercise;

  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (data[yesterdayDate] && data[yesterdayDate].winner) {
      const winner = Object.keys(data[yesterdayDate].winner)[0];
      const reps = data[yesterdayDate].winner[winner];
      message = `Gårsdagens vinner: <@${winner}> med ${reps} repetisjoner!:fire:\n\n${message}`;
    }
  }
  return message;
}

// send messages & read replies and answer
async function sendExcerciseMessage(slackClient, channelId) {
  console.log("\n\n== sendExcerciseMessage ==");
  try {
    const dailyExerciseMessage = await getDailyExerciseMessage(channelId);
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
  // Oppdater vinneren fra gårsdagen
  cron.schedule(
    "0 1 * * 1-5",
    async () => {
      console.log("\n\n1");
      console.log("Calculating and updating yesterday's winners");
      await calculateAndUpdateWinners();
    },
    {
      timezone: "Europe/Oslo",
    }
  );

  // Sende dagens øvelse m/gårdsdagens vinner
  cron.schedule(
    "0 9 * * 1-5",
    async () => {
      console.log("\n\n2");

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

  // Sende oppdatering hver dag 12:00
  // cron.schedule(
  //   // `0 12 * * 1-5`,
  //   async () => {
  //     try {
  //       const activeChannels = getActiveChannels();
  //       if (activeChannels.length === 0) {
  //         console.log("No active channels!");
  //         return;
  //       }
  //       activeChannels.forEach((channelId) => {
  //         sendNoonMessage(slackClient, channelId);
  //       });
  //     } catch (error) {
  //       ConsoleLogError("scheduleMessages { 10:00 } catch error: ", error);
  //     }
  //   },
  //   {
  //     timezone: "Europe/Oslo",
  //   }
  // );

  // Onsdagens halv-uke opdpatering
  cron.schedule(
    "0 0 12 * * 3",
    async () => {
      console.log("\n\n3");

      try {
        const activeChannels = getActiveChannels();
        if (activeChannels.length === 0) {
          console.log("No active channels!");
          return;
        }
        activeChannels.forEach((channelId) => {
          sendHalfWeekUpdate(slackClient, channelId);
        });
      } catch (error) {
        ConsoleLogError(
          "sendHalfWeekUpdate wednesday { 12:00 } catch error: ",
          error
        );
      }
    },
    {
      timezone: "Europe/Oslo",
    }
  );

  // Fredag fulluke opdpatering
  cron.schedule(
    "0 0 12 * * 5",
    async () => {
      console.log("\n4");
      try {
        const activeChannels = getActiveChannels();
        if (activeChannels.length === 0) {
          console.log("No active channels!");
          return;
        }
        activeChannels.forEach((channelId) => {
          sendFullWeekUpdate(slackClient, channelId);
        });
      } catch (error) {
        ConsoleLogError(
          "sendFullWeekUpdate Friday { 12:00 } catch error: ",
          error
        );
      }
    },
    {
      timezone: "Europe/Oslo",
    }
  );

  // Send monthly updates, but run everyday to check if it's the last day of the month
  cron.schedule(
    "30 12 * * 1-5",
    async () => {
      const today = moment().tz("Europe/Oslo");
      const lastDayOfMonth = moment(today).endOf("month");
      const isWeekend = [6, 0].includes(lastDayOfMonth.day());

      if (isWeekend) {
        console.log("\n\n== Sending monthly updates ==");
        // If the last day is a weekend, find the previous Friday
        const lastWeekday = lastDayOfMonth.subtract(
          lastDayOfMonth.day() === 0 ? 2 : 1,
          "days"
        );
        if (today.isSame(lastWeekday, "day")) {
          await sendMonthlyUpdates(slackClient); // This is sent on a Friday
        }
      } else if (today.isSame(lastDayOfMonth, "day")) {
        console.log("\n\n== Sending monthly updates ==");
        await sendMonthlyUpdates(slackClient); // This sends in the weekdays for last day of month
      } else {
        return;
      }
    },
    {
      scheduled: true,
      timezone: "Europe/Oslo",
    }
  );
}
export async function UpdateUserInfo(slackClient) {
  cron.schedule(
    // time runned
    // 1:01
    "1 1 * * 1-5",
    async () => {
      console.log("\n\nUpdating user info");
      try {
        await fetchAndStoreUserInfo(slackClient);
      } catch (error) {
        ConsoleLogError("UpdateUserInfo", error);
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
    response.channels.forEach((channel) => {
      if (channel.is_member) {
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
  } catch (error) {
    ConsoleLogError(
      `removeBotFromChannels error at timeslot: ${new Date()}`,
      error
    );
  }
}

async function removeBotFromChannel(slackClient) {
  console.log("\n\n=== removeBotFromChannel ===");
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

export async function calculateAndUpdateWinners() {
  console.log("\n\n==== calculateAndUpdateWinners ====");
  try {
    // Correctly read the activeChannels.json file
    const activeChannels = JSON.parse(
      fs.readFileSync(activeChannelsFile, "utf8")
    );
    // Use moment-timezone to get 'yesterday' in the Oslo timezone
    const today = moment.tz("Europe/Oslo").format("YYYY-MM-DD");
    const yesterday = moment
      .tz("Europe/Oslo")
      .subtract(1, "days")
      .format("YYYY-MM-DD");
    console.log("today: ", today);
    console.log("yesterday: ", yesterday);

    activeChannels.forEach((channelId) => {
      const filePath = path.join(insightsDir, `${channelId}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

        if (data[yesterday]) {
          const dayData = data[yesterday];
          const winner = Object.keys(dayData).reduce((acc, userId) => {
            return !acc || dayData[userId] > dayData[acc] ? userId : acc;
          }, null);
          console.log("winner: ", winner);

          if (winner) {
            data[yesterday].winner = { [winner]: dayData[winner] };
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in calculateAndUpdateWinners: ", error);
  }
}
