# vigile-mcp

MCP server for [Vigile AI Security](https://vigile.dev) — query trust scores for MCP servers and agent skills directly from Claude Code, Cursor, and other AI agents.

## Quick Start

```bash
npx vigile-mcp
```

Or install globally:

```bash
npm install -g vigile-mcp
```

### Add to Claude Code

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

## Tools

| Tool | Description |
|------|-------------|
| `vigile_check_server` | Look up trust score for an MCP server by name |
| `vigile_check_skill` | Look up trust score for an agent skill by name |
| `vigile_scan_content` | Scan raw tool/skill content for security issues |
| `vigile_search` | Search the Vigile trust registry by keyword |

## Authentication

By default, `vigile-mcp` uses the public Vigile registry (rate-limited). For higher limits, set your API key:

```bash
VIGILE_API_KEY=your_key npx vigile-mcp
```

Or configure it in your MCP client's environment:

```json
{
  "mcpServers": {
    "vigile": {
      "command": "npx",
      "args": ["-y", "vigile-mcp"],
      "env": {
        "VIGILE_API_KEY": "your_key"
      }
    }
  }
}
```

## Rate Limits

| Tier | Scans/min | Monthly Quota |
|------|-----------|---------------|
| Free (no key) | 10 | 50 |
| Pro | 60 | 1,000 |
| Pro+ | 300 | 5,000 |

Registry lookups (`vigile_check_server`, `vigile_check_skill`, `vigile_search`) do not count against your scan quota.

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Vigile AI Security provides security scanning and trust scoring as informational tools only. Trust scores, scan results, and security assessments are based on automated analysis and should not be considered definitive security guarantees.

Vigile does not guarantee the detection of all security threats, vulnerabilities, or malicious behavior. Users are solely responsible for their own security decisions and should use Vigile as one component of a comprehensive security strategy.

Features marked as "Beta" (including Sentinel runtime monitoring) are under active development and may produce false positives, false negatives, or unexpected results.

By using this software, you agree to the [Vigile Terms of Service](https://vigile.dev/terms).

## License

MIT — see [LICENSE](LICENSE) for details.
