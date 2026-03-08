# Vigile MCP Server — Launch Guide

## Quick Start

Run with npx (no install needed):

```bash
npx vigile-mcp
```

Or install globally:

```bash
npm install -g vigile-mcp
```

## Setup by Client

### Claude Desktop

Add to your config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport stdio vigile --scope user -- npx -y vigile-mcp
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"]
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"]
    }
  }
}
```

## Available Tools

| Tool | What It Does |
|------|-------------|
| `vigile_check_server` | Look up the trust score for any MCP server by name or package |
| `vigile_check_skill` | Look up the trust score for an agent skill (claude.md, .cursorrules, etc.) |
| `vigile_scan_content` | Scan raw file content for security issues — paste in a skill file and get findings |
| `vigile_search` | Search the Vigile trust registry by keyword |
| `vigile_verify_location` | Assess location-related privacy risks for AI agent interactions |

## Try It

Once configured, ask your AI assistant:

- "Check if @anthropic/mcp-server-filesystem is safe"
- "Scan this claude.md file for security issues"
- "Search for database MCP servers and show me their trust scores"

## Authentication (Optional)

By default, vigile-mcp uses the public Vigile registry with a free tier (50 scans/month, 10 req/min). For higher limits, add your API key:

```json
{
  "mcpServers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"],
      "env": {
        "VIGILE_API_KEY": "vgl_your_key_here"
      }
    }
  }
}
```

Get an API key at [vigile.dev](https://vigile.dev).

## Requirements

- Node.js 18+
- An MCP-compatible client

## Links

- Website: [vigile.dev](https://vigile.dev)
- GitHub: [github.com/Vigile-ai/vigile-mcp](https://github.com/Vigile-ai/vigile-mcp)
- npm: [npmjs.com/package/vigile-mcp](https://www.npmjs.com/package/vigile-mcp)
