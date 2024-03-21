export async function summarizeMonthly(data) {
  const monthlyScores = {};

  // Iterate through each date's data
  for (const [date, dailyResults] of Object.entries(data)) {
    const month = date.slice(0, 7); // Extract YYYY-MM as month
    if (!monthlyScores[month]) monthlyScores[month] = {};

    // Iterate through each user's score in the daily results, excluding the 'winner' key
    for (const [userId, score] of Object.entries(dailyResults)) {
      if (userId === "winner") continue; // Skip processing the 'winner' object

      // Initialize or update the user's score for the month
      if (!monthlyScores[month][userId]) monthlyScores[month][userId] = 0;
      monthlyScores[month][userId] += score;
    }
  }

  // Process the aggregated monthly scores to determine the top 3 performers for each month
  const monthlyWinners = Object.entries(monthlyScores).reduce(
    (acc, [month, scores]) => {
      // Sort the users by score in descending order and take the top 3
      const top3 = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      acc[month] = top3.map(([userId, score]) => ({ userId, score }));
      return acc;
    },
    {}
  );

  return monthlyWinners;
}

export async function findTopPerformers(data) {
  const userTotals = {};

  // Aggregate scores for each user across all dates
  for (const dailyResults of Object.values(data)) {
    for (const [userId, score] of Object.entries(dailyResults)) {
      if (userId === "winner") continue; // Skip the 'winner' object

      if (!userTotals[userId]) userTotals[userId] = 0;
      userTotals[userId] += score;
    }
  }

  // Convert the aggregated scores to an array, sort it, and take the top 3
  const top3Performers = Object.entries(userTotals)
    .sort((a, b) => b[1] - a[1]) // Sort by score in descending order
    .slice(0, 3) // Take the top 3
    .map(([userId, score]) => ({ userId, score })); // Map to an array of objects for readability

  return top3Performers;
}
