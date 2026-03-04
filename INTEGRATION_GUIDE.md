# Integration Guide

This guide covers integrating the Mealie MCP Server with Vivian and other MCP-compatible clients, including local network setup and security best practices.

## Vivian Integration

Vivian uses the same MCP configuration format as Claude Desktop. The server communicates over **stdio**, so no ports need to be opened.

### Configuration Steps

1. Build the server (see [README.md](README.md))
2. Locate Vivian's MCP config file (check Vivian's documentation for the exact path)
3. Add the server block:

```json
{
  "mcpServers": {
    "mealie": {
      "command": "node",
      "args": ["/absolute/path/to/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://your-mealie-host:9000",
        "MEALIE_API_KEY": "your-api-key"
      }
    }
  }
}
```

4. Restart Vivian and verify the tools appear

## Local Network Setup

If Mealie runs on a different machine than your AI client (e.g., a NAS or home server), use the machine's local IP address.

### Finding Your Mealie Host's IP

```bash
# On Linux/macOS (run on the Mealie host)
hostname -I

# On Windows
ipconfig
```

### Example Config for Remote Mealie

```json
{
  "mcpServers": {
    "mealie": {
      "command": "node",
      "args": ["/Users/alice/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://192.168.1.50:9000",
        "MEALIE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Static IP or Hostname

For reliable local network access, assign a static IP to your Mealie host, or use your router's hostname resolution:

```json
"MEALIE_URL": "http://mealie.local:9000"
```

## Running the MCP Server Remotely

By default the MCP server runs locally (on the same machine as your AI client) and communicates via stdio. This is the recommended setup.

If you need to run the MCP server on a remote machine (advanced), you would need an MCP transport bridge — this is outside the scope of this guide.

## Security Best Practices

### 1. Use Dedicated API Tokens

Create a separate Mealie API token for the MCP server rather than reusing tokens:
- **Name it clearly**: `claude-mcp` or `vivian-mcp`
- **Track it separately**: You can revoke the MCP token without affecting other integrations

### 2. Principle of Least Privilege

Mealie API tokens inherit the permissions of the user who created them. If you only need read access:
- Create a dedicated **read-only Mealie user** for the MCP server
- Generate the API token as that user
- This limits the blast radius if the token is compromised

### 3. Protect Your Config File

The `claude_desktop_config.json` contains your API key. Protect it:

```bash
# macOS — restrict to owner only
chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
chmod 600 ~/.config/Claude/claude_desktop_config.json
```

### 4. Never Commit Credentials

- `.env` is already in `.gitignore` — don't remove it
- Don't commit `claude_desktop_config.json` to version control
- Use environment variables or secret managers in CI/CD contexts

### 5. Use HTTPS for Remote Mealie Instances

If Mealie is accessible over the internet or a semi-trusted network, use HTTPS:

```json
"MEALIE_URL": "https://mealie.yourdomain.com"
```

Configure TLS termination with a reverse proxy like **Nginx**, **Caddy**, or **Traefik** in front of Mealie.

### 6. API Key Rotation

Rotate your Mealie API token periodically:
1. Generate a new token in Mealie → Profile → API Tokens
2. Update `MEALIE_API_KEY` in your config
3. Restart Claude Desktop / Vivian
4. Delete the old token in Mealie

### 7. Network Isolation

For home lab setups:
- Keep Mealie on your internal VLAN
- Don't expose Mealie's port directly to the internet
- Use a VPN if you need remote access (WireGuard, Tailscale)

## Docker Setup (Optional)

You can run the MCP server in a Docker container for isolation:

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
```

### Build and Run

```bash
# Build image
docker build -t mealie-mcp-server .

# Run with environment variables
docker run --rm \
  -e MEALIE_URL=http://mealie:9000 \
  -e MEALIE_API_KEY=your-key \
  mealie-mcp-server
```

Note: When using Docker, the MCP client needs to be configured to use `docker run` as the command. Check your MCP client's documentation for Docker support.

## Multiple Mealie Instances

If you manage multiple Mealie instances (e.g., personal and shared), you can add multiple server entries with different names:

```json
{
  "mcpServers": {
    "mealie-personal": {
      "command": "node",
      "args": ["/path/to/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://localhost:9000",
        "MEALIE_API_KEY": "personal-key"
      }
    },
    "mealie-family": {
      "command": "node",
      "args": ["/path/to/mealie-mcp-server/dist/index.js"],
      "env": {
        "MEALIE_URL": "http://192.168.1.50:9000",
        "MEALIE_API_KEY": "family-key"
      }
    }
  }
}
```

Claude will distinguish between `mealie-personal` and `mealie-family` tools.
