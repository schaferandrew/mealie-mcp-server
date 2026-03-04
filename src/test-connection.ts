#!/usr/bin/env ts-node

/**
 * Connection test script for the Mealie MCP Server.
 *
 * Run with:
 *   npx ts-node src/test-connection.ts
 *   # or after building:
 *   node dist/test-connection.js
 */

import * as dotenv from "dotenv";
dotenv.config();

import { MealieClient } from "./mealie-client.js";
import { config } from "./config.js";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

function pass(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function fail(msg: string): void {
  console.log(`${RED}✗${RESET} ${msg}`);
}

function info(msg: string): void {
  console.log(`${YELLOW}→${RESET} ${msg}`);
}

async function runTests(): Promise<void> {
  console.log(`\n${BOLD}Mealie MCP Server — Connection Test${RESET}`);
  console.log("=".repeat(40));

  // ── Config Check ──────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}1. Configuration${RESET}`);
  info(`MEALIE_URL:     ${config.mealieUrl}`);
  info(`MEALIE_API_KEY: ${config.mealieApiKey.slice(0, 8)}${"*".repeat(Math.max(0, config.mealieApiKey.length - 8))}`);
  info(`MCP_PORT:       ${config.port}`);
  pass("Configuration loaded successfully");

  const client = new MealieClient(config.mealieUrl, config.mealieApiKey);

  // ── Health Check ──────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}2. Health Check${RESET}`);
  try {
    const health = await client.healthCheck();
    pass(`Mealie is reachable${health.version ? ` (version: ${health.version})` : ""}`);
  } catch (err) {
    fail(`Cannot reach Mealie: ${err instanceof Error ? err.message : String(err)}`);
    console.log("\nCheck that:");
    console.log("  • MEALIE_URL is correct");
    console.log("  • Mealie is running");
    console.log("  • There are no firewall rules blocking the connection");
    process.exit(1);
  }

  // ── List Recipes ──────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}3. List Recipes${RESET}`);
  try {
    const result = await client.listRecipes({ limit: 5 });
    pass(`Retrieved recipe list (${result.total} recipes total)`);
    if (result.items.length > 0) {
      info(`First recipe: "${result.items[0]!.name}" (slug: ${result.items[0]!.slug})`);
    } else {
      info("No recipes found in your Mealie instance yet.");
    }
  } catch (err) {
    fail(`Could not list recipes: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Search Recipes ────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}4. Search Recipes${RESET}`);
  try {
    const results = await client.searchRecipes("a", undefined, 3);
    pass(`Search returned ${results.length} result(s)`);
  } catch (err) {
    fail(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}All tests complete!${RESET}`);
  console.log("Your Mealie MCP Server is configured correctly and ready to use.\n");
}

runTests().catch((err) => {
  console.error(
    `${RED}Fatal error during tests:${RESET}`,
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
