# Dual Transport Upgrade Plan
## `@schaferandrew/mealie-mcp-server` — stdio + HTTP/SSE Support

---

## PHASE 1 — Audit of Current Transport

### 1.1 How `src/index.ts` wires up the MCP server today

**Transport class used:**
```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

**Server instantiation** (`src/index.ts:24–34`):
```ts
const server = new Server(
  { name: "mealie-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
```

**Handler registration** (`src/index.ts:40–91`):
- `server.setRequestHandler(ListToolsRequestSchema, ...)` — returns all five `TOOL_DEFINITIONS`
- `server.setRequestHandler(CallToolRequestSchema, ...)` — delegates to `handleTool(name, args, client)`; wraps Zod, unknown-tool, and API errors

**Startup sequence** (`src/index.ts:95–109`):
1. `dotenv.config()` runs at module load via `src/config.ts`
2. `config` is read (validates `MEALIE_URL`, `MEALIE_API_KEY`, optional `MCP_PORT`)
3. `MealieClient` is instantiated with those values
4. `main()` calls `client.healthCheck()` (non-fatal if unreachable)
5. `new StdioServerTransport()` → `server.connect(transport)`
6. All stdio I/O is now owned by the SDK

**Current invocation (from `package.json` scripts):**
```json
"start": "node dist/index.js",
"dev":   "ts-node src/index.ts"
```
Claude Desktop / npx invocations pass no flags — transport mode is fully implicit.

**Graceful shutdown:** `SIGINT` / `SIGTERM` both call `server.close()` then `process.exit(0)`.

**Logging:** all output goes to `process.stderr` (correct — stdout is the MCP wire).

---

### 1.2 SDK version reality check

`package.json` declares `"@modelcontextprotocol/sdk": "^1.0.4"` but `package-lock.json`
resolves to **`1.27.1`** — the current latest. All API references below apply to **1.27.1**.

---

### 1.3 HTTP/SSE transports available in SDK 1.27.1

Inspected from `node_modules/@modelcontextprotocol/sdk/dist/cjs/server/`:

| File | Class | Status | Notes |
|------|-------|--------|-------|
| `stdio.js` | `StdioServerTransport` | ✅ Current | Used today |
| `sse.js` | `SSEServerTransport` | ⚠️ Deprecated | Legacy SSE; still functional |
| `streamableHttp.js` | `StreamableHTTPServerTransport` | ✅ Preferred | Modern MCP spec; wraps `@hono/node-server` |
| `express.js` | `createMcpExpressApp()` | ✅ Helper | Returns pre-configured Express 5 app |

**`StreamableHTTPServerTransport` key facts:**

```ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Stateless (simplest — one server handles all connections, no session tracking)
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

// Stateful (server assigns session IDs; correct for multi-client production use)
import { randomUUID } from "node:crypto";
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
```

**The SDK does NOT create the HTTP server.** The app must create a Node.js `http.Server`
(or Express app) and route requests to `transport.handleRequest(req, res)`. The transport
handles both:
- `GET /mcp` → opens SSE stream (server → client notifications)
- `POST /mcp` → receives JSON-RPC messages (client → server calls)

**Express is a transitive dependency** of the SDK (`"express": "^5.2.1"` in SDK's
`package.json`). No separate `npm install express` is required for the runtime, but
`@types/express` must be added as a devDependency to compile TypeScript against it.

---

## PHASE 2 — Dual Transport Implementation

### 2.1 Goal

Single `src/index.ts` entry point. Transport is selected at startup via:

```
TRANSPORT=stdio   # default — existing behavior, zero regression
TRANSPORT=http    # new — HTTP server on MCP_PORT with StreamableHTTPServerTransport
```

**Constraint:** `src/tools.ts` and `src/mealie-client.ts` are **not touched**.

---

### 2.2 Changes required

#### A. `src/config.ts` — add `transport` field

Add `transport` to `ServerConfig` (already defined in `src/types.ts`) and read
`process.env.TRANSPORT` in `getConfig()`:

```ts
// In getConfig():
const transport = (process.env.TRANSPORT ?? "stdio").toLowerCase();
if (transport !== "stdio" && transport !== "http") {
  throw new Error(`TRANSPORT must be 'stdio' or 'http', got: '${process.env.TRANSPORT}'`);
}
return { mealieUrl, mealieApiKey, port, transport };
```

Update `ServerConfig` interface in `src/types.ts`:
```ts
export interface ServerConfig {
  mealieUrl: string;
  mealieApiKey: string;
  port: number;
  transport: "stdio" | "http";   // ← add this
}
```

#### B. `src/index.ts` — replace hardcoded `StdioServerTransport` with a dispatch

The server instantiation and handler registration blocks stay **identical**.
Only the `main()` function changes:

```ts
import http from "node:http";
import { randomUUID } from "node:crypto";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

async function main(): Promise<void> {
  // Health check (non-fatal) — same for both transports
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

// ── stdio mode (existing behavior, unchanged) ──────────────────────────────────
async function startStdioTransport(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("Mealie MCP Server running on stdio — ready for connections.");
}

// ── HTTP/SSE mode (new) ────────────────────────────────────────────────────────
async function startHttpTransport(): Promise<void> {
  // Stateless: every request shares the same MCP session.
  // Good for single-client deployments (Claude.ai remote MCP, simple proxies).
  // For multi-client, replace with stateful session management (see note below).
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // stateless
  });

  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    // Route all traffic to the MCP transport handler
    transport.handleRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(config.port, () => {
      log(`Mealie MCP Server running on HTTP port ${config.port}`);
      log(`  POST /  — send JSON-RPC messages`);
      log(`  GET  /  — open SSE stream (server-sent events)`);
      resolve();
    });
  });

  // Ensure the HTTP server is closed on graceful shutdown
  process.on("SIGINT",  async () => { httpServer.close(); await server.close(); process.exit(0); });
  process.on("SIGTERM", async () => { httpServer.close(); await server.close(); process.exit(0); });
}
```

> **Note on stateful multi-client HTTP mode (future work):**
> For production deployments with concurrent clients, each `GET /` connection should
> get its own `StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() })`
> instance, each connected to its own `Server` instance. Session IDs returned in
> `Mcp-Session-Id` response headers are then used to route subsequent `POST` requests
> to the correct transport. This is out of scope for this upgrade but the stateless
> implementation above is a clean foundation to extend.

---

### 2.3 stdio mode — preserved behavior checklist

| Concern | Status |
|---------|--------|
| `StdioServerTransport` still used when `TRANSPORT=stdio` or unset | ✅ unchanged |
| All logging to `stderr` | ✅ unchanged |
| `SIGINT` / `SIGTERM` handlers | ✅ unchanged for stdio path |
| `npx @schaferandrew/mealie-mcp-server` (no env override) → stdio | ✅ default |
| Claude Desktop JSON config works without `TRANSPORT` var | ✅ no breaking change |

---

### 2.4 HTTP mode behavior

| Route | Method | SDK handler | Purpose |
|-------|--------|-------------|---------|
| `/` | `POST` | `transport.handleRequest` | Receive JSON-RPC from client |
| `/` | `GET`  | `transport.handleRequest` | Open SSE stream for server notifications |

Port defaults to `3000` (existing `MCP_PORT` env var, already in `config.port`).

For Claude.ai remote MCP integration or any SSE-capable MCP client, the connection URL is:
```
http://<host>:<MCP_PORT>/
```

---

## PHASE 3 — Supporting File Changes

### 3.1 `.env.example` — add `TRANSPORT` documentation

```dotenv
# Optional: Transport mode ('stdio' or 'http', default: 'stdio')
# Use 'http' for remote/Docker deployments accessed over the network.
# Use 'stdio' (or omit) for Claude Desktop / npx invocations.
TRANSPORT=stdio

# Optional: Port for HTTP transport mode (default: 3000)
# Only used when TRANSPORT=http
MCP_PORT=3000
```

Update the existing `MCP_PORT` comment to clarify it is now actively used in http mode
(the current comment says "only used for local reference").

### 3.2 `package.json` — add devDependency and convenience scripts

```json
"devDependencies": {
  "@types/node": "^22.10.2",
  "@types/express": "^5.0.0",   // ← add (needed for TS compilation against express.d.ts)
  "ts-node": "^10.9.2",
  "typescript": "^5.7.2"
},
"scripts": {
  "start":        "node dist/index.js",
  "start:http":   "TRANSPORT=http node dist/index.js",   // ← convenience
  "dev":          "ts-node src/index.ts",
  "dev:http":     "TRANSPORT=http ts-node src/index.ts", // ← convenience
  ...
}
```

> Express itself does **not** need to be added to `dependencies` — it is already a
> transitive dependency via the SDK. However `@types/express` is needed at compile time.
> If the build fails due to missing types, run: `npm install --save-dev @types/express@^5`

### 3.3 `tsconfig.json` — no changes required

Current config targets `ES2020` / `NodeNext` modules. `node:http` and `node:crypto`
are in `@types/node` which is already a devDependency.

---

## PHASE 4 — Build & Verification Steps

```bash
# 1. Install deps (picks up any new devDeps)
npm install

# 2. Compile
npm run build
# Expected: zero TypeScript errors, dist/ populated

# 3. Smoke-test stdio mode (existing behavior)
MEALIE_URL=http://localhost:9000 MEALIE_API_KEY=test node dist/index.js
# Expected: stderr shows "Connected to Mealie..." or warning, then "running on stdio"

# 4. Smoke-test HTTP mode
MEALIE_URL=http://localhost:9000 MEALIE_API_KEY=test TRANSPORT=http MCP_PORT=3001 node dist/index.js &
# Expected: stderr shows "Mealie MCP Server running on HTTP port 3001"
curl -s http://localhost:3001/ -H "Accept: text/event-stream" | head -5
# Expected: SSE preamble / connection established
kill %1

# 5. Run existing test-connection script (stdio path, unchanged)
npm run test-connection
```

---

## PHASE 5 — Docker Support (Optional / Future)

If a `Dockerfile` is added later, HTTP mode is the natural container target:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENV TRANSPORT=http
ENV MCP_PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

A `docker-compose.yml` would set `MEALIE_URL`, `MEALIE_API_KEY`, and optionally override
`TRANSPORT` / `MCP_PORT` via an env file. No Dockerfile exists in the repo today —
these are notes for a follow-up task.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/index.ts` | Add HTTP transport path in `main()`; extract `startStdioTransport()` and `startHttpTransport()` |
| `src/config.ts` | Read + validate `TRANSPORT` env var; add to returned config |
| `src/types.ts` | Add `transport: "stdio" \| "http"` to `ServerConfig` interface |
| `.env.example` | Document `TRANSPORT` var; update `MCP_PORT` comment |
| `package.json` | Add `@types/express` devDep; add `start:http` and `dev:http` scripts |
| `src/tools.ts` | **Not touched** |
| `src/mealie-client.ts` | **Not touched** |
