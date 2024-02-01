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

export function updateStats(channelId, threadTimestamp, userId, repetitions) {
  const filePath = path.join(insightsDir, `${channelId}.json`);
  const dateKey = new Date(parseFloat(threadTimestamp) * 1000)
    .toISOString()
    .split("T")[0]; // Convert timestamp to date

  fs.readFile(filePath, (err, data) => {
    if (err && err.code === "ENOENT") {
      // File not found, creating a new one
      var stats = {};
      stats[dateKey] = {};
      stats[dateKey][userId] = repetitions;
    } else if (err) {
      console.error("Error reading file:", err);
      return;
    } else {
      // File exists, update the existing data
      var stats = JSON.parse(data);

      if (!stats[dateKey]) {
        stats[dateKey] = {};
      }

      if (!stats[dateKey][userId]) {
        stats[dateKey][userId] = 0;
      }

      stats[dateKey][userId] += repetitions;
    }

    // Write the updated data back to the file
    fs.writeFile(filePath, JSON.stringify(stats, null, 2), (err) => {
      if (err) {
        console.error("Error writing file:", err);
      } else {
        console.log(`Stats updated for user ${userId} on ${dateKey}`);
      }
    });
  });
}

export async function getNoonStatsMessage(channelId) {
  const currentDate = format(new Date(), "yyyy-MM-dd"); // Format today's date as YYYY-MM-DD
  const insightFilePath = path.join(insightsDir, `${channelId}.json`); // Path to the insight file for the channel

  try {
    // Check if the insight file exists
    if (fs.existsSync(insightFilePath)) {
      const data = JSON.parse(fs.readFileSync(insightFilePath, "utf8"));
      const dailyStats = data[currentDate];

      if (!dailyStats) {
        return "No statistics available for today. Keep up the great work! 🚀";
      }

      let message = "Daily noon statistics:\n";
      for (const userId in dailyStats) {
        const score = dailyStats[userId];
        message += `<@${userId}>: ${score} repetitions\n`; // Tagging the user and showing their score
      }

      message +=
        "\nKeep it up! 💪 Remember, every repetition counts towards your weekly goal! 🎯";
      return message;
    } else {
      return "No statistics available yet. Get moving and log your repetitions! 🏃‍♂️💨";
    }
  } catch (error) {
    console.error("Error generating noon stats message:", error);
    return "There was an error retrieving today’s statistics. Please try again later.";
  }
}
