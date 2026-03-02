# Claude Desktop Configuration Guide

This guide explains how to add the Mealie MCP Server to Claude Desktop so you can manage your recipes directly in conversations.

## Prerequisites

- Claude Desktop installed and running
- Mealie MCP Server built locally (see [README.md](README.md))
- Your Mealie URL and API key ready

## Step 1: Build the Server

```bash
cd mealie-mcp-server
npm install
npm run build
```

Verify the build succeeded:
```bash
ls dist/index.js  # should exist
```

## Step 2: Locate the Claude Desktop Config File

| Platform | Config File Location |
|---|---|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

If the file doesn't exist yet, create it.

## Step 3: Add the MCP Server Configuration

Open `claude_desktop_config.json` and add the `mealie-mcp-server` entry.

### Option A: With Environment Variables in Config (Simplest)

```json
{
  "mcpServers": {
    "mealie": {
      "command": "node",
      "args": ["/absolute/path/to/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://localhost:9000",
        "MEALIE_API_KEY": "your-mealie-api-key-here"
      }
    }
  }
}
```

Replace:
- `/absolute/path/to/mealie-mcp-server` with the actual path (e.g., `/Users/alice/projects/mealie-mcp-server`)
- `http://localhost:9000` with your Mealie URL
- `your-mealie-api-key-here` with your Mealie API token

### Option B: Using a .env File

If you prefer to keep credentials in a `.env` file:

```json
{
  "mcpServers": {
    "mealie": {
      "command": "node",
      "args": ["-e", "require('dotenv').config({path:'/absolute/path/to/mealie-mcp-server/.env'}); require('/absolute/path/to/mealie-mcp-server/dist/index.js')"]
    }
  }
}
```

### Option C: Using npx (After npm publish)

If the package is published to npm:

```json
{
  "mcpServers": {
    "mealie": {
      "command": "npx",
      "args": ["-y", "mealie-mcp-server"],
      "env": {
        "MEALIE_URL": "http://localhost:9000",
        "MEALIE_API_KEY": "your-mealie-api-key-here"
      }
    }
  }
}
```

### Full Config Example (with other MCP servers)

```json
{
  "mcpServers": {
    "mealie": {
      "command": "node",
      "args": ["/Users/alice/projects/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://localhost:9000",
        "MEALIE_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/alice/Documents"]
    }
  }
}
```

## Step 4: Restart Claude Desktop

After saving the config file, **fully quit and relaunch** Claude Desktop.

On macOS: `Cmd+Q` then reopen, or right-click the dock icon → Quit

## Step 5: Verify the Connection

1. Open a new Claude conversation
2. Look for the **tools icon** (hammer/wrench) in the input area — if Mealie tools are available, you'll see them listed
3. Try asking: `"List all my recipes"` or `"What Mealie tools do you have available?"`

You should see Claude use the `list_recipes` or similar tool and return your recipes.

## Troubleshooting

### "Server failed to start"

Check that:
- The path in `args` is correct and the file exists
- Node.js is in your PATH: `node --version` should return v18+
- The build succeeded: `ls dist/index.js`

### "Authentication failed"

Check that:
- `MEALIE_API_KEY` is correct (copy directly from Mealie's UI)
- The token has not expired

### "Mealie is unreachable"

Check that:
- `MEALIE_URL` is correct (no trailing slash)
- Mealie is running: open the URL in your browser
- If using `localhost`, Mealie must be running on the same machine as Claude Desktop

### "Permission denied"

The API key may have limited permissions. Try creating a new admin-level API token in Mealie.

### Tools Not Appearing in Claude

1. Confirm the JSON in `claude_desktop_config.json` is valid (use a JSON validator)
2. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`
3. Run the connection test manually: `npm run test-connection`

### Viewing Server Logs

The MCP server logs to **stderr**. To capture logs during debugging:

```bash
# Run manually and pipe stderr to a log file
node dist/index.js 2>mealie-mcp.log
```

## Security Reminder

The `claude_desktop_config.json` file contains your API key. Ensure:
- The file has appropriate permissions (`chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json` on macOS)
- You don't commit this file to version control
- You use a dedicated API token with minimum required permissions
