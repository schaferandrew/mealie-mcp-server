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

No installation required — run directly with `npx`:

```bash
npx @schaferandrew/mealie-mcp-server
```

Or install globally if you prefer:

```bash
npm install -g @schaferandrew/mealie-mcp-server
```

## Claude Desktop Setup

Add the server to your Claude Desktop config file:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mealie": {
      "command": "npx",
      "args": ["-y", "@schaferandrew/mealie-mcp-server"],
      "env": {
        "MEALIE_URL": "http://your-mealie-instance:9000",
        "MEALIE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop — you should see the Mealie tools available in Claude.

## Claude Code Setup

```bash
claude mcp add mealie -- npx -y @schaferandrew/mealie-mcp-server \
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

## Configuration

| Environment Variable | Required | Description |
|---|---|---|
| `MEALIE_URL` | Yes | Base URL of your Mealie instance (e.g. `http://localhost:9000`) |
| `MEALIE_API_KEY` | Yes | API token generated in your Mealie profile |

## Security Notes

- API keys are never logged — credentials are redacted from all error messages
- Never hardcode credentials; use environment variables
- `.env` is gitignored — `.env.example` is safe to commit

## Development

Clone the repo and install dependencies:

```bash
git clone https://github.com/schaferandrew/mealie-mcp-server.git
cd mealie-mcp-server
npm install
npm run build
```

Test your Mealie connection:

```bash
MEALIE_URL=http://your-instance MEALIE_API_KEY=your-key npm run test-connection
```

### Releasing a New Version

Releases are published to npm automatically when a GitHub Release is published.

1. Bump the version in `package.json`:
   ```bash
   npm version patch --no-git-tag-version   # 0.1.0 → 0.1.1  (bug fixes)
   npm version minor --no-git-tag-version   # 0.1.0 → 0.2.0  (new features)
   npm version major --no-git-tag-version   # 0.1.0 → 1.0.0  (breaking changes)
   ```

2. Commit, open a PR, and merge into `main`.

3. On GitHub, go to **Releases → Draft a new release**, set the tag (e.g. `v0.1.1`), and click **Publish release**.

GitHub Actions will publish to npm automatically.

> **Note:** `NPM_TOKEN` must be set in your repo under **Settings → Secrets and variables → Actions**.

## License

MIT
