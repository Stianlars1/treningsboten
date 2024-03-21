import { config } from "./config.js";

export const validateToken = (token) => {
  return config.ALLOWED_USERS.includes(token);
};
