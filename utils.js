import fs from "fs";
import { config } from "./config.js";

import path from "path";
import { fileURLToPath } from "url";
process.env.TZ = "Europe/Oslo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const activeChannelsDir = path.join(dataDir, "activeChannels");
const insightsDir = path.join(dataDir, "insights");

export const validateToken = (token) => {
  const formattedToken = token
    .trim()
    .replace("-", "")
    .replace(" ", "")
    .toLowerCase();
  return config.ALLOWED_USERS.includes(formattedToken);
};

export const validateChannelAlias = (channel) => {
  const formattedChannel = channel
    .trim()
    .replace("-", "")
    .replace(" ", "")
    .toLowerCase();
  return config.ALLOWED_CHANNEL_ALIASES.includes(formattedChannel);
};

// check by file or our function validateChannel to validate if the file or function is working as expected
export const isChannelValid = (channel) => {
  const insightsFilePath = path.join(insightsDir, `${channel}.json`);
  const activeChannelFilePath = path.join(activeChannelsDir, `${channel}.json`);
  const fileExists =
    fs.existsSync(insightsFilePath) || fs.existsSync(activeChannelFilePath);
  const doChannelExist = validateChannelAlias(channel);

  return fileExists || doChannelExist;
};
