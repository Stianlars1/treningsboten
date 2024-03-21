export async function summarizeMonthly(insightsData, userInfoData) {
  const monthlyScores = {};

  // Iterate through each date's data
  for (const [date, dailyResults] of Object.entries(insightsData)) {
    const month = date.slice(0, 7); // Extract YYYY-MM as month
    if (!monthlyScores[month]) monthlyScores[month] = {};

    // Iterate through each user's score in the daily results, excluding the 'winner' key
    for (const [userId, score] of Object.entries(dailyResults)) {
      if (userId === "winner") continue; // Skip processing the 'winner' object

      // Initialize or update the user's score for the month
      if (!monthlyScores[month][userId]) {
        monthlyScores[month][userId] = {
          score: 0,
          user: userInfoData[userId] || {},
        };
      }
      monthlyScores[month][userId].score += score;
    }
  }

  // Process the aggregated monthly scores to determine the top 3 performers for each month
  const monthlyWinners = Object.entries(monthlyScores).reduce(
    (acc, [month, users]) => {
      // Sort the users by score in descending order and take the top 3
      const top3 = Object.entries(users)
        .sort(([, aData], [, bData]) => bData.score - aData.score)
        .slice(0, 3)
        .map(([userId, { score, user }]) => ({
          userId,
          score,
          ...user,
        }));

      acc[month] = top3;
      return acc;
    },
    {}
  );

  return monthlyWinners;
}

export async function findTopPerformers(insightsData, userInfoData) {
  const userTotals = {};

  // Aggregate scores for each user across all dates
  for (const dailyResults of Object.values(insightsData)) {
    for (const [userId, score] of Object.entries(dailyResults)) {
      if (userId === "winner") continue; // Skip the 'winner' object

      if (!userTotals[userId])
        userTotals[userId] = { score: 0, user: userInfoData };
      userTotals[userId].score += score;
    }
  }
  // Convert the aggregated scores to an array, sort it by score in descending order, and take the top 3
  const top3Performers = Object.entries(userTotals)
    .sort(([, aData], [, bData]) => bData.score - aData.score) // Adjusted to access nested score for sorting
    .slice(0, 3) // Take the top 3
    .map(([userId, { score, user }]) => ({
      userId,
      score,
      ...user,
    }));

  return top3Performers;
}
