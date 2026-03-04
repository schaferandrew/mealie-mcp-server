# Mealie MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects your AI assistant to your [Mealie](https://mealie.io) self-hosted recipe manager.

Once connected, you can ask Claude things like:
- "What recipes do I have with pasta?"
- "Show me all my chicken recipes"
- "Import this recipe from the URL: ..."
- "What recipes use cream cheese?"

## Prerequisites

- **Node.js** 18 or later
- A running **Mealie** instance (v1.0+ recommended)
- A **Mealie API key** (see below)

## Getting Your Mealie API Key

1. Open your Mealie instance in a browser
2. Click your profile icon → **Profile**
3. Scroll to the **API Tokens** section
4. Click **Create API Token**, give it a name (e.g. `claude`), and click **Generate**
5. **Copy the token immediately** — it won't be shown again

## Installation

Clone the repo and build:

```bash
git clone https://github.com/your-username/mealie-mcp-server.git
cd mealie-mcp-server
npm install
npm run build
```

## Claude Desktop Setup

Add the server to your Claude Desktop config file:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mealie": {
      "command": "/path/to/node",
      "args": ["/path/to/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://your-mealie-instance:9000",
        "MEALIE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

To find your Node path:
```bash
which node
```

Then restart Claude Desktop. You should see the Mealie tools available in Claude.

## Claude Code Setup

```bash
claude mcp add mealie /path/to/node /path/to/mealie-mcp-server/dist/index.js \
  -e MEALIE_URL=http://your-mealie-instance:9000 \
  -e MEALIE_API_KEY=your-api-key-here
```

Add `--scope global` to make it available in all projects.

## Available Tools

| Tool | Description |
|---|---|
| `search_recipes` | Search recipes by name or keyword |
| `get_recipe` | Get full recipe details including ingredients & instructions |
| `list_recipes` | List all recipes with optional tag/category filters |
| `add_recipe_from_url` | Import a recipe by scraping a URL |
| `search_by_ingredient` | Find recipes containing a specific ingredient |

## Project Structure

```
mealie-mcp-server/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── mealie-client.ts   # Mealie REST API wrapper
│   ├── tools.ts           # Tool definitions, schemas, and handlers
│   ├── config.ts          # Environment variable management
│   ├── types.ts           # TypeScript interfaces
│   └── test-connection.ts # Connection verification script
├── .env.example
├── package.json
└── tsconfig.json
```

## Testing the Connection

```bash
MEALIE_URL=http://your-instance MEALIE_API_KEY=your-key npm run test-connection
```

## Security Notes

- API keys are never logged — credentials are redacted from all error messages
- Never hardcode credentials; use environment variables or a `.env` file
- `.env` is gitignored — `.env.example` is safe to commit

## Releasing a New Version

Releases are published to npm automatically when a version tag is pushed to GitHub.

### Steps

1. On a new branch, bump the version in `package.json`:
   ```bash
   npm version patch --no-git-tag-version   # 0.1.0 → 0.1.1  (bug fixes)
   npm version minor --no-git-tag-version   # 0.1.0 → 0.2.0  (new features)
   npm version major --no-git-tag-version   # 0.1.0 → 1.0.0  (breaking changes)
   ```

2. Commit, open a PR, and merge it into `main`.

3. On GitHub, go to **Releases → Draft a new release**:
   - Set the tag to match the version (e.g. `v0.1.1`)
   - Click **Publish release**

GitHub Actions will publish to npm automatically when the release is published.

> **Note:** Make sure `NPM_TOKEN` is set in your GitHub repo under **Settings → Secrets and variables → Actions**.

## License

MIT
