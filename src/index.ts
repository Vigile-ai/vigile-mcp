#!/usr/bin/env node
// ============================================================
// Vigile MCP Server — Trust scores for AI agent workflows
// ============================================================
// Provides tools for checking MCP server and agent skill trust
// scores from within Claude Code, Cursor, and other AI agents.
//
// Installation:
//   npx vigile-mcp                    (stdio mode)
//
// Claude Desktop / Claude Code config:
//   "mcpServers": {
//     "vigile": {
//       "command": "npx",
//       "args": ["vigile-mcp"]
//     }
//   }

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkServer } from "./tools/check-server.js";
import { checkSkill } from "./tools/check-skill.js";
import { scanContent } from "./tools/scan-content.js";
import { searchRegistry } from "./tools/search.js";

const _rawApiUrl = process.env.VIGILE_API_URL || "https://api.vigile.dev";
// Validate API URL — must be HTTPS (unless localhost for development)
const API_BASE = (() => {
  try {
    const u = new URL(_rawApiUrl);
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
      console.error(`[vigile-mcp] VIGILE_API_URL must use HTTPS. Got: ${u.protocol}`);
      return "https://api.vigile.dev";
    }
    return u.origin;
  } catch {
    console.error(`[vigile-mcp] Invalid VIGILE_API_URL: ${_rawApiUrl}`);
    return "https://api.vigile.dev";
  }
})();
const API_KEY = process.env.VIGILE_API_KEY || "";

const server = new McpServer({
  name: "vigile",
  version: "0.1.0",
});

// ── Tool: vigile_check_server ──

server.tool(
  "vigile_check_server",
  "Look up the trust score and security findings for an MCP server in the Vigile registry. Returns trust score (0-100), trust level, findings summary, and a link to the full report.",
  {
    name: z.string().min(1).max(500).describe("MCP server name or npm package name (e.g., '@anthropic/mcp-server-filesystem')"),
  },
  async ({ name }) => {
    const result = await checkServer(API_BASE, API_KEY, name);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_check_skill ──

server.tool(
  "vigile_check_skill",
  "Look up the trust score for an agent skill (claude.md, .cursorrules, skill.md, etc.) in the Vigile registry. Returns trust score, trust level, findings summary.",
  {
    name: z.string().min(1).max(500).describe("Agent skill name (e.g., 'react-component-builder')"),
  },
  async ({ name }) => {
    const result = await checkSkill(API_BASE, API_KEY, name);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_scan_content ──

server.tool(
  "vigile_scan_content",
  "Scan the content of an agent skill file for security issues. Submit raw content from a claude.md, .cursorrules, skill.md, or similar file for analysis. Returns trust score and detailed findings.",
  {
    content: z.string().min(1).max(500_000).describe("The raw text content to scan (max 500KB)"),
    file_type: z.string().max(50).optional().describe("File type: skill.md, claude.md, cursorrules, mdc-rule (default: skill.md)"),
    name: z.string().max(500).optional().describe("Optional name for the scan result"),
  },
  async ({ content, file_type, name }) => {
    const result = await scanContent(API_BASE, API_KEY, content, file_type, name);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_search ──

server.tool(
  "vigile_search",
  "Search the Vigile registry for MCP servers and agent skills by keyword. Returns matching entries with trust scores. Use this when you need to find servers by description or capability.",
  {
    query: z.string().min(1).max(200).describe("Search query (e.g., 'filesystem', 'database', 'code execution')"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default: 10, max: 50)"),
  },
  async ({ query, limit }) => {
    const result = await searchRegistry(API_BASE, API_KEY, query, limit);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
