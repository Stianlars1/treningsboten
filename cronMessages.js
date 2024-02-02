import fs from "fs";
import moment from "moment-timezone";
import path from "path";
import { getWeekStart } from "./dates.js";
import { sendMessage } from "./helpers.js";

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
        statsMessage += `${userId}: ${totalReps} :fire:\n`;
        if (totalReps > maxReps) {
          maxUser = userId;
          maxReps = totalReps;
        }
      });

      // Update the message with the user that has the most repetitions
      statsMessage += `\nDet kan se ut som at ${maxUser} ligger an til å vinne denne ukas fitness-trofee:trophy:, kan noen klare å ta han igjen?:bangbang:\n\nStå på ut uken!💪🏻`;

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
