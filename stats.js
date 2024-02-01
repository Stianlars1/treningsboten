import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
export const activeChannelsDir = path.join(dataDir, "activeChannels");
export const insightsDir = path.join(dataDir, "insights");
export const activeChannelsFile = path.join(
  activeChannelsDir,
  "activeChannels.json"
);

export function updateStatsForThread(
  channelId,
  thread_ts,
  userId,
  repetitions
) {
  const insightsPath = path.join(insightsDir, `${channelId}.json`);
  const date = new Date(parseFloat(thread_ts) * 1000)
    .toISOString()
    .split("T")[0]; // Convert timestamp to date

  // Check if the file exists
  if (fs.existsSync(insightsPath)) {
    // File exists, read and update it
    fs.readFile(insightsPath, (err, data) => {
      if (err) throw err;

      const stats = JSON.parse(data);

      if (!stats[date]) {
        stats[date] = {};
      }

      if (!stats[date][userId]) {
        stats[date][userId] = 0;
      }

      stats[date][userId] += repetitions;

      fs.writeFile(insightsPath, JSON.stringify(stats, null, 2), (err) => {
        if (err) throw err;
        console.log("Stats updated for user", userId, "on", date);
      });
    });
  } else {
    // File does not exist, create it with the initial data
    const initialStats = {
      [date]: {
        [userId]: repetitions,
      },
    };

    fs.writeFile(insightsPath, JSON.stringify(initialStats, null, 2), (err) => {
      if (err) throw err;
      console.log(
        "Stats file created and updated for user",
        userId,
        "on",
        date
      );
    });
  }
}

// export function updateStats(channelId, threadTimestamp, userId, repetitions) {
//   const filePath = path.join(insightsDir, `${channelId}.json`);
//   const dateKey = new Date(parseFloat(threadTimestamp) * 1000)
//     .toISOString()
//     .split("T")[0]; // Convert timestamp to date

//   fs.readFile(filePath, (err, data) => {
//     if (err && err.code === "ENOENT") {
//       // File not found, creating a new one
//       var stats = {};
//       stats[dateKey] = {};
//       stats[dateKey][userId] = repetitions;
//     } else if (err) {
//       console.error("Error reading file:", err);
//       return;
//     } else {
//       // File exists, update the existing data
//       var stats = JSON.parse(data);

//       if (!stats[dateKey]) {
//         stats[dateKey] = {};
//       }

//       if (!stats[dateKey][userId]) {
//         stats[dateKey][userId] = 0;
//       }

//       stats[dateKey][userId] += repetitions;
//     }

//     // Write the updated data back to the file
//     fs.writeFile(filePath, JSON.stringify(stats, null, 2), (err) => {
//       if (err) {
//         console.error("Error writing file:", err);
//       } else {
//         console.log(`Stats updated for user ${userId} on ${dateKey}`);
//       }
//     });
//   });
// }

export async function getNoonStatsMessage(channelId) {
  const currentDate = new Date().toISOString().split("T")[0]; // Formater dagens dato som YYYY-MM-DD med native JavaScript
  console.log(`Current Date: ${currentDate}`); // Log the current date

  const insightFilePath = path.join(insightsDir, `${channelId}.json`); // Sti til innsiktsfilen for kanalen
  console.log(`Insight File Path: ${insightFilePath}`); // Log the full path to the insights file

  try {
    // Check if the insight file exists
    if (fs.existsSync(insightFilePath)) {
      console.log(`Insight file exists for channel: ${channelId}`); // Confirm file exists
      const data = JSON.parse(fs.readFileSync(insightFilePath, "utf8"));
      console.log(`Data read from file: `, data); // Log the data read from the file

      const dailyStats = data[currentDate];
      console.log(`Daily Stats for ${currentDate}: `, dailyStats); // Log the daily stats

      if (!dailyStats) {
        return "Ingen statistikk tilgjengelig for i dag. Fortsett det gode arbeidet! 🚀";
      }

      let message = "Statistikk for formiddagen:\n";
      for (const userId in dailyStats) {
        const score = dailyStats[userId];
        message += `<@${userId}>: ${score} repetisjoner\n`; // Tagger brukeren og viser deres poengsum
      }

      message +=
        "\nHold det gående! 💪 Husk, hver repetisjon teller mot ditt ukentlige mål! 🎯";
      console.log(`Final message: ${message}`); // Log the final message
      return message;
    } else {
      console.log(`No insight file found for channel: ${channelId}`); // Log if file doesn't exist
      return "Ingen statistikk er tilgjengelig ennå. Kom deg i bevegelse og loggfør dine repetisjoner! 🏃‍♂️💨";
    }
  } catch (error) {
    console.error("Feil ved generering av middagsstatistikk:", error);
    return "Det oppstod en feil ved henting av dagens statistikk. Vennligst prøv igjen senere.";
  }
}
