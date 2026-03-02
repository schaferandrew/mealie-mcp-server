import * as dotenv from "dotenv";
import { ServerConfig } from "./types.js";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
        `Please check your .env file or environment configuration.`
    );
  }
  return value;
}

function getConfig(): ServerConfig {
  const mealieUrl = requireEnv("MEALIE_URL").replace(/\/$/, ""); // strip trailing slash
  const mealieApiKey = requireEnv("MEALIE_API_KEY");
  const port = parseInt(process.env["MCP_PORT"] ?? "3000", 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`MCP_PORT must be a valid port number (1-65535), got: ${process.env["MCP_PORT"]}`);
  }

  return { mealieUrl, mealieApiKey, port };
}

export const config = getConfig();
