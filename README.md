# vigile-mcp

MCP server for [Vigile AI Security](https://vigile.dev) — query trust scores for MCP servers and agent skills directly from your AI coding assistant.

Works with Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, and any MCP-compatible client.

## Installation

### Claude Desktop

Add to your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

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

Or add to your project's `.mcp.json`:

```json
{
  "vigile": {
    "command": "npx",
    "args": ["-y", "vigile-mcp"]
  }
}
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

### Global Install (Alternative)

```bash
npm install -g vigile-mcp
```

Then replace `"command": "npx", "args": ["-y", "vigile-mcp"]` with `"command": "vigile-mcp"` in any config above.

## What It Does

Vigile scans and scores MCP servers and agent skills for security issues like tool poisoning, data exfiltration, prompt injection, and supply chain attacks. This MCP server brings those trust scores into your AI workflow — so your coding assistant can check whether a tool is safe before using it.

Covers servers from npm, Smithery, PyPI, and other registries, plus agent skills from Claude Code, Cursor, OpenClaw/ClawHub, and more.

## Tools

| Tool | Description |
|------|-------------|
| `vigile_check_server` | Look up trust score for an MCP server by name or package |
| `vigile_check_skill` | Look up trust score for an agent skill (claude.md, .cursorrules, OpenClaw skills, etc.) |
| `vigile_scan_content` | Scan raw content from a claude.md, .cursorrules, skill.md, or similar file for security issues |
| `vigile_search` | Search the Vigile trust registry by keyword |

### Example Usage

Once installed, your AI assistant can use these tools naturally:

> "Check if @anthropic/mcp-server-filesystem is safe"
> "Scan this claude.md file for security issues"
> "Search for database MCP servers and show me their trust scores"

## Trust Scores

Vigile rates every server and skill on a 0-100 scale:

| Score | Level | Meaning |
|-------|-------|---------|
| 80-100 | Trusted | No significant issues found |
| 60-79 | Caution | Minor issues, review recommended |
| 40-59 | Risky | Notable security concerns |
| 0-39 | Dangerous | Critical issues, do not use |

## Authentication

By default, `vigile-mcp` uses the public Vigile registry (rate-limited). For higher limits, set your API key:

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

## Rate Limits

| Tier | Scans/min | Monthly Quota |
|------|-----------|---------------|
| Free (no key) | 10 | 50 |
| Pro ($9.99/mo) | 60 | 1,000 |
| Pro+ ($29.99/mo) | 300 | 5,000 |

Registry lookups (`vigile_check_server`, `vigile_check_skill`, `vigile_search`) do not count against your scan quota. Only `vigile_scan_content` consumes scans.

## Requirements

- Node.js 18+
- An MCP-compatible client

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Vigile AI Security provides security scanning and trust scoring as informational tools only. Trust scores, scan results, and security assessments are based on automated analysis and should not be considered definitive security guarantees.

Vigile does not guarantee the detection of all security threats, vulnerabilities, or malicious behavior. Users are solely responsible for their own security decisions and should use Vigile as one component of a comprehensive security strategy.

By using this software, you agree to the [Vigile Terms of Service](https://vigile.dev/terms).

## License

MIT
