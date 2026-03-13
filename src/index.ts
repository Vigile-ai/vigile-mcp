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
import { checkProvenance } from "./tools/check-provenance.js";
import { recallMemory } from "./tools/recall.js";
import { rememberMemory } from "./tools/remember.js";
import { scanContent } from "./tools/scan-content.js";
import { searchRegistry } from "./tools/search.js";
import { timelineMemory } from "./tools/timeline.js";
import { verifyLocation } from "./tools/verify-location.js";

const _rawApiUrl = process.env.VIGILE_API_URL || "https://api.vigile.dev";
// Validate API URL — must be HTTPS (unless localhost for development)
const API_BASE = (() => {
  try {
    const u = new URL(_rawApiUrl);
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
      console.error(`[vigile-mcp] VIGILE_API_URL must use HTTPS — falling back to default`);
      return "https://api.vigile.dev";
    }
    return u.origin;
  } catch {
    console.error(`[vigile-mcp] Invalid VIGILE_API_URL — falling back to default`);
    return "https://api.vigile.dev";
  }
})();
const API_KEY = process.env.VIGILE_API_KEY || "";

const server = new McpServer({
  name: "vigile",
  version: "0.1.7",
});

// ── Tool: vigile_check_server ──

server.tool(
  "vigile_check_server",
  "Look up the trust score and security findings for an MCP server in the Vigile registry. Returns trust score (0-100), trust level, findings summary, and a link to the full report.",
  {
    name: z.string().min(1).max(200).describe("MCP server name or npm package name (e.g., '@anthropic/mcp-server-filesystem')"),
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
    name: z.string().min(1).max(200).describe("Agent skill name (e.g., 'react-component-builder')"),
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
    content: z.string().min(1).max(100_000).describe("The raw text content to scan (max 100KB)"),
    file_type: z.string().min(1).max(30).optional().describe("File type: skill.md, claude.md, cursorrules, mdc-rule (default: skill.md)"),
    name: z.string().min(1).max(200).optional().describe("Optional name for the scan result"),
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

// ── Tool: vigile_verify_location ──

server.tool(
  "vigile_verify_location",
  "Assess location-related privacy and safety risks for AI agent interactions involving physical-world context (deliveries, meetups, financial transactions). Accepts an H3 cell index (preferred, privacy-preserving) or lat/lng coordinates with optional context. Returns risk level, score, factors, and recommendation. All assessment is performed locally — no location data is transmitted to Vigile servers.",
  {
    h3_cell: z.string().max(20).optional().describe("H3 cell index (15-character hex string, preferred for privacy over raw coordinates)"),
    latitude: z.number().min(-90).max(90).optional().describe("Latitude (-90 to 90). Provide with longitude as an alternative to h3_cell."),
    longitude: z.number().min(-180).max(180).optional().describe("Longitude (-180 to 180). Provide with latitude as an alternative to h3_cell."),
    context: z.string().max(500).optional().describe("Context of the interaction (e.g., 'delivery to home address', 'in-person meetup', 'financial transaction')"),
  },
  async ({ h3_cell, latitude, longitude, context }) => {
    const result = await verifyLocation(API_BASE, API_KEY, { h3_cell, latitude, longitude, context });
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_recall ──

server.tool(
  "vigile_recall",
  "Recall prior Vigile security memory context for an entity, pattern, or incident. Returns compact context, evidence chunks, and source references with provenance status.",
  {
    query: z.string().min(2).max(400).describe("Recall query, e.g. 'previous incident for inc_123'"),
    scope: z.array(z.string().min(2).max(30)).max(20).optional().describe("Optional retrieval scope filters"),
    max_chunks: z.number().int().min(1).max(20).optional().describe("Maximum evidence chunks (default: 8)"),
    risk_level: z.enum(["low", "medium", "high"]).optional().describe("Set to high for high-risk actions"),
    retrieval_mode: z.enum(["default", "ontology_v1"]).optional().describe("Experimental retrieval mode"),
  },
  async ({ query, scope, max_chunks, risk_level, retrieval_mode }) => {
    const result = await recallMemory(API_BASE, API_KEY, query, scope, max_chunks, risk_level, retrieval_mode);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_timeline ──

server.tool(
  "vigile_timeline",
  "Fetch a security timeline for an incident or topic from Vigile memory.",
  {
    topic: z.string().min(2).max(200).optional().describe("Topic selector for timeline lookup"),
    incident_id: z.string().min(2).max(120).optional().describe("Incident ID selector (preferred when known)"),
  },
  async ({ topic, incident_id }) => {
    const result = await timelineMemory(API_BASE, API_KEY, { topic, incident_id });
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_check_provenance ──

server.tool(
  "vigile_check_provenance",
  "Fetch canonical provenance payload for a memory source ID.",
  {
    source_id: z.string().min(3).max(128).describe("Canonical source identifier"),
  },
  async ({ source_id }) => {
    const result = await checkProvenance(API_BASE, API_KEY, source_id);
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Tool: vigile_remember ──

server.tool(
  "vigile_remember",
  "Record a bounded security memory episode for future recall (idempotent write path).",
  {
    event_type: z.string().min(2).max(120).describe("Episode event type"),
    entity_id: z.string().min(2).max(120).optional().describe("Optional linked entity ID"),
    summary: z.string().min(2).max(500).optional().describe("Optional human summary"),
    adapter_type: z.enum(["event", "evidence", "incident", "advisory"]).optional(),
    sensitivity: z.enum(["standard", "restricted"]).optional(),
    payload: z.record(z.string(), z.any()).optional().describe("Structured payload (PII/secrets redacted by API policy)"),
    source_refs: z.array(
      z.object({
        source_id: z.string().min(3).max(128),
        source_type: z.enum(["incident", "finding", "event", "scan", "advisory", "rule", "episode", "external"]),
        title: z.string().min(2).max(200),
        url: z.string().max(500).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    ).optional(),
    idempotency_key: z.string().min(8).max(128).optional(),
  },
  async ({ event_type, entity_id, summary, adapter_type, sensitivity, payload, source_refs, idempotency_key }) => {
    const result = await rememberMemory(API_BASE, API_KEY, {
      event_type,
      entity_id,
      summary,
      adapter_type,
      sensitivity,
      payload,
      source_refs,
      idempotency_key,
    });
    return { content: [{ type: "text" as const, text: result }] };
  }
);

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Log structured error — message only, no stack traces leaked to stderr
      console.error(`[vigile-mcp] Connection failed: ${error.message}`);
    } else {
      console.error("[vigile-mcp] Connection failed: unexpected error");
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  // Startup failure — log safely and exit
  const msg = error instanceof Error ? error.message : "unknown startup error";
  console.error(`[vigile-mcp] Fatal: ${msg}`);
  process.exit(1);
});
