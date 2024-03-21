import { config } from "./config";

export const validateToken = (token) => {
  return config.ALLOWED_USERS.includes(token);
};
