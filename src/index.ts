#!/usr/bin/env node

/**
 * Mealie MCP Server
 *
 * Exposes Mealie recipe management capabilities as MCP tools for use
 * with Claude Desktop, Vivian, and other MCP-compatible AI assistants.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config.js";
import { MealieClient } from "./mealie-client.js";
import { TOOL_DEFINITIONS, handleTool } from "./tools.js";

// ─── Server Setup ──────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "mealie-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const client = new MealieClient(config.mealieUrl, config.mealieApiKey);

// ─── Tool Listing ──────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// ─── Tool Execution ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleTool(name, args ?? {}, client);
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error) {
    // Zod validation errors
    if (error instanceof Error && error.name === "ZodError") {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters for tool '${name}': ${error.message}`
      );
    }

    // Unknown tool
    if (error instanceof Error && error.message.startsWith("Unknown tool:")) {
      throw new McpError(ErrorCode.MethodNotFound, error.message);
    }

    // API / network errors — surface as tool errors so Claude can relay them to the user
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Startup ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Verify connectivity on startup (non-fatal — Mealie might not be up yet)
  try {
    const health = await client.healthCheck();
    log(`Connected to Mealie ${health.version ? `v${health.version} ` : ""}at ${config.mealieUrl}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Warning: Could not connect to Mealie at startup: ${msg}`);
    log("The server will start anyway — tools will report errors if Mealie is unreachable.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Mealie MCP Server running on stdio — ready for connections.");
}

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
  log("Received SIGINT, shutting down gracefully...");
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log("Received SIGTERM, shutting down gracefully...");
  await server.close();
  process.exit(0);
});

// ─── Logging ───────────────────────────────────────────────────────────────────

function log(message: string): void {
  // MCP servers communicate over stdio, so all logging must go to stderr
  process.stderr.write(`[mealie-mcp] ${message}\n`);
}

// ─── Entry ─────────────────────────────────────────────────────────────────────

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[mealie-mcp] Fatal error: ${message}\n`);
  process.exit(1);
});
