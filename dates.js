// Helper function to get the start of the week (Monday) for a given date
import moment from "moment-timezone";

export function getWeekStart(date) {
  return moment(date).tz("Europe/Oslo").startOf("isoWeek");
}

export function getWeekStartForFriday(date) {
  // Adjusting to get Monday of the current week, even when called on Friday
  return moment(date).tz("Europe/Oslo").startOf("isoWeek");
}
