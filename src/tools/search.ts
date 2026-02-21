// ============================================================
// vigile_search — Search the Vigile registry
// ============================================================

import { fetchVigile, trustLevelEmoji, formatScore } from "./api.js";

export async function searchRegistry(
  baseUrl: string,
  apiKey: string,
  query: string,
  limit?: number
): Promise<string> {
  const effectiveLimit = Math.min(limit || 10, 50);
  const qs = `q=${encodeURIComponent(query)}&limit=${effectiveLimit}`;

  // Search both servers and skills in parallel
  const [serverRes, skillRes] = await Promise.all([
    fetchVigile(baseUrl, apiKey, `/api/v1/search/?${qs}`),
    fetchVigile(baseUrl, apiKey, `/api/v1/search/skills?${qs}`),
  ]);

  const servers = serverRes.ok && Array.isArray(serverRes.data) ? serverRes.data : [];
  const skills = skillRes.ok && Array.isArray(skillRes.data) ? skillRes.data : [];

  if (servers.length === 0 && skills.length === 0) {
    return [
      `## Search: "${query}"`,
      "",
      "No results found in the Vigile registry.",
      "",
      "Try a different search term, or submit a server/skill for scanning at https://vigile.dev",
    ].join("\n");
  }

  const lines = [`## Search: "${query}"`, ""];

  // Server results
  if (servers.length > 0) {
    lines.push(`### MCP Servers (${servers.length} results)`, "");
    lines.push("| Server | Score | Level | Source |");
    lines.push("|--------|-------|-------|--------|");
    for (const s of servers) {
      const emoji = trustLevelEmoji(s.trust_level);
      lines.push(
        `| [${s.name}](https://vigile.dev/server/${encodeURIComponent(s.name)}) | ${formatScore(s.trust_score)} | ${emoji} ${s.trust_level} | ${s.source} |`
      );
    }
  }

  // Skill results
  if (skills.length > 0) {
    if (servers.length > 0) lines.push("");
    lines.push(`### Agent Skills (${skills.length} results)`, "");
    lines.push("| Skill | Score | Level | Platform |");
    lines.push("|-------|-------|-------|----------|");
    for (const s of skills) {
      const emoji = trustLevelEmoji(s.trust_level);
      lines.push(
        `| [${s.name}](https://vigile.dev/skill/${encodeURIComponent(s.name)}) | ${formatScore(s.trust_score)} | ${emoji} ${s.trust_level} | ${s.platform} |`
      );
    }
  }

  return lines.join("\n");
}
