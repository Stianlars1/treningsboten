import fs from "fs";
import moment from "moment-timezone";
import path from "path";
import { fileURLToPath } from "url";
import { getWeekStart, getWeekStartForFriday } from "./dates.js";
import { getActiveChannels, sendMessage } from "./helpers.js";
import { compileMonthlyStats } from "./stats.js";

process.env.TZ = "Europe/Oslo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
export const activeChannelsDir = path.join(dataDir, "activeChannels");
export const insightsDir = path.join(dataDir, "insights");
export const activeChannelsFile = path.join(
  activeChannelsDir,
  "activeChannels.json"
);

export async function sendHalfWeekUpdate(slackClient, channelId) {
  console.log("\n\n== sendHalfWeekUpdate ==");
  try {
    const today = moment().tz("Europe/Oslo");
    const weekStart = getWeekStart(today);
    const filePath = path.join(insightsDir, `${channelId}.json`);

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      let statsMessage =
        "Hei superhelter 🚀 Her kommer onsdagens halvveis-i-mål oppdatering.\n\nStatistikk for uken (hittil):\n";

      let userTotals = {}; // Object to hold the total repetitions for each user

      // Loop through each day from Monday to Wednesday and sum repetitions for each user
      for (let day = 0; day <= 2; day++) {
        const currentDate = moment(weekStart)
          .add(day, "days")
          .format("YYYY-MM-DD");
        if (data[currentDate]) {
          Object.entries(data[currentDate]).forEach(([userId, reps]) => {
            if (!userTotals[userId]) userTotals[userId] = 0;
            userTotals[userId] += reps;
          });
        }
      }

      // Append each user's total repetitions to the message
      let maxUser = null;
      let maxReps = 0;
      Object.entries(userTotals).forEach(([userId, totalReps]) => {
        if (userId === "winner") return; // Skip the winner from the previous week

        statsMessage += `<@${userId}>: ${totalReps} reps :fire:\n`;
        if (totalReps > maxReps) {
          maxUser = userId;
          maxReps = totalReps;
        }
      });

      // Update the message with the user that has the most repetitions
      statsMessage += `\nDet kan se ut som at <@${maxUser}> ligger an til å *vinne* denne ukas fitness-trofee:trophy: kan noen klare å ta han igjen?:bangbang:\n\nStå på ut uken!💪🏻`;

      // Use your existing sendMessage function to send the statsMessage to the channel
      const result = await sendMessage(slackClient, channelId, statsMessage);
      if (result) {
        console.log(
          "Half week statistics message sent successfully for channel: ",
          channelId
        );
      } else {
        console.log(
          "Message not sent for channel: ",
          channelId,
          " with result: ",
          result
        );
      }
    }
  } catch (error) {
    console.error("Error in sendHalfWeekUpdate: ", error);
  }
}

// Function to send the full-week update every Friday
export async function sendFullWeekUpdate(slackClient, channelId) {
  console.log("\n\n== sendFullWeekUpdate ==");
  try {
    const today = moment().tz("Europe/Oslo");
    const weekStart = getWeekStartForFriday(today);
    const filePath = path.join(insightsDir, `${channelId}.json`);

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      let statsMessage =
        "Hei superhelter 🚀 Fredagens ukeoppdatering er her!\n\nStatistikk for hele uken:\n";

      let userTotals = {}; // Object to hold the total repetitions for each user from Monday to Friday

      // Loop through each day from Monday to Friday and sum repetitions for each user
      for (let day = 0; day <= 4; day++) {
        const currentDate = moment(weekStart)
          .add(day, "days")
          .format("YYYY-MM-DD");
        if (data[currentDate]) {
          Object.entries(data[currentDate]).forEach(([userId, reps]) => {
            if (!userTotals[userId]) userTotals[userId] = 0;
            userTotals[userId] += reps;
          });
        }
      }

      // Find the user with the highest total
      let maxUser = null;
      let maxReps = 0;
      Object.entries(userTotals).forEach(([userId, totalReps]) => {
        if (userId === "winner") return; // Skip the winner from the previous week
        statsMessage += `<@${userId}>: ${totalReps} reps :fire:\n`;
        if (totalReps > maxReps) {
          maxUser = userId;
          maxReps = totalReps;
        }
      });

      // Update the message with a cooler Friday approach
      statsMessage += `\nOg vinneren for denne uka er \n\n<@${maxUser}> med ${maxReps} repetisjoner! 🎉 \n\nHvem tar utfordringen og overgår dette før helgen? 💪\n\nGod helg og lad opp til nye utfordringer neste uke! 🚀`;

      // Use your existing sendMessage function to send the statsMessage to the channel
      await sendMessage(slackClient, channelId, statsMessage);
    }
  } catch (error) {
    console.error("Error in sendFullWeekUpdate: ", error);
  }
}

export async function sendMonthlyUpdates() {
  const channelsData = getActiveChannels(); // Assuming this function returns an array of channel IDs
  channelsData.forEach(async (channelId) => {
    const stats = await compileMonthlyStats(channelId); // Assume this function compiles the monthly stats

    if (!stats) {
      console.log(`No data for channel ${channelId} this month.`);
      return;
    }

    const sortedUsers = Object.entries(stats).sort((a, b) => b[1] - a[1]); // Sort users by their total repetitions
    let message = `Hei superhelter 🚀 Månedens oppsummering er her!\n\n🏆 Månedens topp 3:\n`;

    sortedUsers.slice(0, 3).forEach(([userId, reps], index) => {
      const medal = ["🥇", "🥈", "🥉"][index];
      message += `${medal} <@${userId}> med ${reps} repetisjoner\n`;
    });

    message += `\nFantastisk innsats alle sammen! La oss gjøre neste måned enda bedre! 🚀🎉`;

    // Send the message to the Slack channel
    await sendMessage(slackClient, channelId, message);
  });
}
