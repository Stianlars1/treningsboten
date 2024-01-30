import "dotenv/config";

const domain = "treningsboten";

export const allowedOrigins = [
  `http://www.${domain}.com`,
  `http://${domain}.com`,
  `https://www.${domain}.com`,
  `https://${domain}.com`,
  "http://localhost:3000",
  "http://localhost",
  "http://localhost:443",
  "http://localhost:80",
  "http://localhost:4330",
  "http://localhost:8433",
  "http://www.localhost:3000",
  "https://localhost:3000",
];
