#!/usr/bin/env node

/**
 * Mealie MCP Server
 *
 * Exposes Mealie recipe management capabilities as MCP tools for use
 * with Claude Desktop, Vivian, and other MCP-compatible AI assistants.
 *
 * Transport is selected via the TRANSPORT env var:
 *   TRANSPORT=stdio  (default) — communicate over stdin/stdout
 *   TRANSPORT=http             — HTTP server with Streamable HTTP/SSE transport
 */

import http from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "./config";
import { MealieClient } from "./mealie-client";
import { TOOL_DEFINITIONS, handleTool } from "./tools";

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

  if (config.transport === "http") {
    await startHttpTransport();
  } else {
    await startStdioTransport();
  }
}

// ─── stdio transport (default) ─────────────────────────────────────────────────

async function startStdioTransport(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Mealie MCP Server running on stdio — ready for connections.");
}

// ─── HTTP/SSE transport ────────────────────────────────────────────────────────

async function startHttpTransport(): Promise<void> {
  // Stateful mode: the server assigns a session ID on the first request.
  // Each MCP client gets its own session tracked by Mcp-Session-Id header.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    transport.handleRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(config.port, () => {
      log(`Mealie MCP Server running in HTTP mode on port ${config.port}`);
      log(`  POST /  — send JSON-RPC messages`);
      log(`  GET  /  — open SSE stream`);
      resolve();
    });
  });

  process.on("SIGINT", async () => {
    log("Received SIGINT, shutting down gracefully...");
    httpServer.close();
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    log("Received SIGTERM, shutting down gracefully...");
    httpServer.close();
    await server.close();
    process.exit(0);
  });
}

// ─── Graceful Shutdown (stdio) ─────────────────────────────────────────────────

// HTTP mode registers its own shutdown handlers above (they also close httpServer).
// These fire only when in stdio mode (or as a fallback).
process.on("SIGINT", async () => {
  if (config.transport !== "http") {
    log("Received SIGINT, shutting down gracefully...");
    await server.close();
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  if (config.transport !== "http") {
    log("Received SIGTERM, shutting down gracefully...");
    await server.close();
    process.exit(0);
  }
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
