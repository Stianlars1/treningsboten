import moment from "moment-timezone";

export async function summarizeToday(insightsData, userInfoData) {
  const scoreToday = {};
  const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD

  // Check if there's data for today
  const dailyResults = insightsData[today];
  if (!dailyResults) {
    return null; // Return an empty object if there's no data for today
  }

  // Iterate through today's scores, excluding the 'winner' key
  for (const [userId, score] of Object.entries(dailyResults)) {
    if (userId === "winner") continue; // Skip the 'winner' object

    // Initialize or update the user's score for today
    scoreToday[userId] = {
      score,
      user: userInfoData[userId] || { name: "Unknown", avatar: "" }, // Fallback to default if no userInfo
    };
  }

  // Optionally, sort today's scores if you want to rank users based on today's performance
  const sortedScoresToday = Object.entries(scoreToday)
    .sort(([, aData], [, bData]) => bData.score - aData.score)
    .map(([userId, { score, user }]) => ({
      userId,
      score,
      ...user,
    }));

  return sortedScoresToday;
}

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
        userTotals[userId] = { score: 0, user: userInfoData[userId] };
      userTotals[userId].score += score;
    }
  }
  // Convert the aggregated scores to an array, sort it by score in descending order, and take the top 3
  const top3Performers = Object.entries(userTotals)
    .sort(([, aData], [, bData]) => bData.score - aData.score) // Adjusted to access nested score for sorting
    .map(([userId, { score, user }]) => ({
      userId,
      score,
      ...user,
    }));

  return top3Performers;
}

export async function thisWeeksScore(insightsData, userInfoData) {
  const userTotals = {};
  // Moment.js to get start of the week (Monday) and today
  const startOfWeek = moment().tz("Europe/Oslo").startOf("isoWeek");
  const today = moment().tz("Europe/Oslo");

  // Aggregate scores for each user from the start of the week to today
  for (const [date, dailyResults] of Object.entries(insightsData)) {
    const currentDate = moment(date);
    // Check if the date is within this week's range
    if (currentDate.isBefore(startOfWeek) || currentDate.isAfter(today)) {
      continue; // Skip data not in the range from this week's Monday to today
    }

    for (const [userId, score] of Object.entries(dailyResults)) {
      if (userId === "winner") continue; // Skip the 'winner' object

      // Ensure we have an object for the user and add the score
      userTotals[userId] = userTotals[userId] || {
        score: 0,
        ...(userInfoData[userId] || undefined),
      };
      userTotals[userId].score += score;
    }
  }

  // Convert the aggregated scores to an array, sort it by score in descending order, and return
  const thisWeeksScore = Object.entries(userTotals)
    .map(([userId, { score, user }]) => ({
      userId,
      score,
      ...user,
    }))
    .sort((a, b) => b.score - a.score); // Sort after mapping to keep the user data

  return thisWeeksScore;
}
export async function getYesterdaysWinner(insightsData, userInfoData) {
  const yesterday = moment()
    .tz("Europe/Oslo")
    .subtract(1, "days")
    .format("YYYY-MM-DD");

  const dailyResults = insightsData[yesterday] || undefined;

  if (!dailyResults) {
    return undefined;
  }

  const winner = dailyResults.winner || dailyResults["winner"];
  const yesterdaysWinner = Object.keys(winner).map((userId) => ({
    userId,
    score: winner[userId],
    ...(userInfoData[userId] || undefined),
  }));

  return yesterdaysWinner;
}
