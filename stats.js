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
  threadTimestamp,
  userId,
  repetitions
) {
  const filePath = path.join(__dirname, "activeChannels", `${channelId}.json`);
  fs.readFile(filePath, (err, data) => {
    console.log("## running updateStatsForThread ##");
    if (err) throw err;

    const channelData = JSON.parse(data);
    const date = Object.keys(channelData.threads).find(
      (key) => channelData.threads[key] === threadTimestamp
    );

    if (date) {
      const insightsPath = path.join(
        __dirname,
        "insights",
        `${channelId}.json`
      );
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

        fs.writeFile(insightsPath, JSON.stringify(stats), (err) => {
          if (err) throw err;
          console.log("Stats updated for user", userId, "on", date);
        });
      });
    }
  });
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
