# Mealie MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects your AI assistant (Claude, Vivian, or any MCP-compatible client) to your [Mealie](https://mealie.io) self-hosted recipe manager.

Once installed, you can ask your AI:
- "What recipes do I have with pasta?"
- "Show me all my chicken recipes"
- "Get the full details for my lasagna recipe"
- "Add a new recipe for chocolate chip cookies with these ingredients: ..."
- "What recipes use cream cheese?"
- "Update my brownie recipe to add a 'dessert' tag"

## Prerequisites

- **Node.js** 18 or later
- A running **Mealie** instance (v1.0+ recommended)
- A **Mealie API key** (see [Getting Your API Key](#getting-your-mealie-api-key))

## Getting Your Mealie API Key

1. Open your Mealie instance in a browser
2. Click your profile icon → **Profile** (or navigate to `/user/profile`)
3. Scroll to the **API Tokens** section
4. Click **Create API Token**
5. Give the token a name (e.g., `claude-mcp`) and click **Generate**
6. **Copy the token immediately** — it will not be shown again

## Installation

### Option 1: npx (No Installation Required)

Run directly without installing:

```bash
npx mealie-mcp-server
```

Set environment variables before running:

```bash
MEALIE_URL=http://localhost:9000 MEALIE_API_KEY=your-key npx mealie-mcp-server
```

### Option 2: Global Installation

```bash
npm install -g mealie-mcp-server
mealie-mcp-server
```

### Option 3: Local Installation (Recommended for Claude Desktop)

```bash
# Clone the repository
git clone https://github.com/your-username/mealie-mcp-server.git
cd mealie-mcp-server

# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Copy and configure environment
cp .env.example .env
# Edit .env with your Mealie URL and API key
```

### Option 4: Development Mode

Run without building (requires ts-node):

```bash
npm install
cp .env.example .env
# Edit .env
npm run dev
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
MEALIE_URL=http://localhost:9000
MEALIE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MCP_PORT=3000
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `MEALIE_URL` | Yes | — | Base URL of your Mealie instance |
| `MEALIE_API_KEY` | Yes | — | API token from Mealie |
| `MCP_PORT` | No | `3000` | Port reference (server uses stdio for MCP) |

## Testing the Connection

After configuration, verify the server can reach your Mealie instance:

```bash
npm run test-connection
```

Expected output:
```
Mealie MCP Server — Connection Test
========================================

1. Configuration
→ MEALIE_URL:     http://localhost:9000
→ MEALIE_API_KEY: eyJhbGci********
→ MCP_PORT:       3000
✓ Configuration loaded successfully

2. Health Check
✓ Mealie is reachable (version: 1.12.0)

3. List Recipes
✓ Retrieved recipe list (47 recipes total)
→ First recipe: "Banana Bread" (slug: banana-bread)

4. Search Recipes
✓ Search returned 3 result(s)

All tests complete!
Your Mealie MCP Server is configured correctly and ready to use.
```

## Running the Server

```bash
# After building
npm start

# Or in development
npm run dev
```

The server communicates over **stdio** (standard input/output) as required by the MCP protocol. You don't need to open a browser or port — your MCP client (Claude Desktop, Vivian) manages the connection.

## Available Tools

| Tool | Description |
|---|---|
| `search_recipes` | Search recipes by name or keyword |
| `get_recipe` | Get full recipe details including ingredients & instructions |
| `list_recipes` | List all recipes with optional tag/category filters |
| `add_recipe` | Create a new recipe |
| `update_recipe` | Update fields on an existing recipe |
| `search_by_ingredient` | Find recipes containing a specific ingredient |

See [API_REFERENCE.md](API_REFERENCE.md) for full parameter documentation.

## Integration Guides

- **Claude Desktop**: See [CLAUDE_DESKTOP_CONFIG.md](CLAUDE_DESKTOP_CONFIG.md)
- **Vivian / Other clients**: See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

## Project Structure

```
mealie-mcp-server/
├── src/
│   ├── index.ts           # MCP server entry point & request handlers
│   ├── mealie-client.ts   # Mealie REST API wrapper
│   ├── tools.ts           # MCP tool definitions, schemas, and formatters
│   ├── config.ts          # Environment variable management
│   ├── types.ts           # TypeScript interfaces for Mealie API
│   └── test-connection.ts # Connection verification script
├── .env.example           # Environment variable template
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE_DESKTOP_CONFIG.md
├── INTEGRATION_GUIDE.md
└── API_REFERENCE.md
```

## Security Notes

- **API keys are never logged** — the server redacts credentials from all error messages
- **Use environment variables** or `.env` file — never hardcode credentials
- **`.env` is gitignored** — the `.env.example` template is safe to commit
- For public-facing setups, use HTTPS for your Mealie URL

## License

MIT
