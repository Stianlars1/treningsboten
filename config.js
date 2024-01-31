import "dotenv/config";

export const config = {
  // proivate channel for testing
  SLACK_SIGNIN_SECRET: process.env.SLACK_SIGNIN_SECRET,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_BOT_USER_ID: process.env.SLACK_BOT_USER_ID,
  SLACK_CHANNEL_ID_PRIVAT: process.env.SLACK_CHANNEL_ID_PRIVAT,

  // SB1 Official channel
  SLACK_SIGNIN_SECRET_SPB1: process.env.SLACK_SIGNIN_SECRET_SPB1,
  SLACK_BOT_TOKEN_SPB1: process.env.SLACK_BOT_TOKEN_SPB1,
  SLACK_BOT_USER_ID_SPB1: process.env.SLACK_BOT_USER_ID_SPB1,
  OVERSIKT_LUNSJ_CHANNEL: process.env.SLACK_CHANNEL_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
