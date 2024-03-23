import fs from "fs";
import { config } from "./config.js";

import path from "path";
import { fileURLToPath } from "url";
process.env.TZ = "Europe/Oslo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// directories
const dataDir = path.join(__dirname, "data");
const activeChannelsDir = path.join(dataDir, "activeChannels");
const insightsDir = path.join(dataDir, "insights");

// files
const mapTeamToChannelFile = path.join(
  activeChannelsDir,
  `mapTeamToChannel.json`
);

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
  console.log("## isChannelValid ##");
  const insightsFilePath = path.join(insightsDir, `${channel}.json`);
  const activeChannelFilePath = path.join(activeChannelsDir, `${channel}.json`);
  console.log("#### paths\n: ", insightsFilePath, activeChannelFilePath);

  const fileExists =
    fs.existsSync(insightsFilePath) || fs.existsSync(activeChannelFilePath);
  const doChannelExist = validateChannelAlias(channel);
  console.log(
    "#### fileExists, doChannelExist\n: ",
    fileExists,
    doChannelExist
  );
  return fileExists || doChannelExist;
};

export const mapTeamToChannel = async (channel) => {
  const parsedFile = await JSON.parse(
    fs.readFileSync(mapTeamToChannelFile, "utf8")
  );
  const channelId = Object.keys(parsedFile).find(
    (key) => key.toLowerCase() === channel.toLowerCase()
  );

  return channelId;
};
