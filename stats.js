export function updateStatsForThread(
  channelId,
  thread_ts,
  userId,
  repetitions
) {
  const filePath = path.join(__dirname, "activeChannels", `${channelId}.json`);
  fs.readFile(filePath, (err, data) => {
    if (err) throw err;

    const channelData = JSON.parse(data);
    const date = Object.keys(channelData.threads).find(
      (key) => channelData.threads[key] === thread_ts
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
