// ============================================================
// vigile_check_server — Look up MCP server trust score
// ============================================================

import { fetchVigile, trustLevelEmoji, formatScore } from "./api.js";

export async function checkServer(
  baseUrl: string,
  apiKey: string,
  name: string
): Promise<string> {
  const { ok, status, data } = await fetchVigile(
    baseUrl,
    apiKey,
    `/api/v1/registry/${encodeURIComponent(name)}`
  );

  if (!ok) {
    if (status === 404) {
      return [
        `## MCP Server: ${name}`,
        "",
        "**Not found in the Vigile registry.**",
        "",
        "This server hasn't been scanned yet. You can:",
        `- Submit it for scanning at https://vigile.dev`,
        `- Run \`npx vigile-scan ${name}\` to scan it locally`,
        "",
        "⚠️ An unscanned server should be treated with caution.",
      ].join("\n");
    }
    return `Error looking up "${name}": ${data?.detail || `HTTP ${status}`}`;
  }

  const emoji = trustLevelEmoji(data.trust_level);
  const lines = [
    `## ${emoji} ${data.name}`,
    "",
    `**Trust Score:** ${formatScore(data.trust_score)}`,
    `**Trust Level:** ${data.trust_level}`,
    `**Source:** ${data.source}`,
  ];

  if (data.description) {
    lines.push(`**Description:** ${data.description}`);
  }
  if (data.maintainer) {
    lines.push(`**Maintainer:** ${data.maintainer}`);
  }
  if (data.downloads_weekly) {
    lines.push(`**Weekly Downloads:** ${data.downloads_weekly.toLocaleString()}`);
  }
  if (data.stars) {
    lines.push(`**GitHub Stars:** ${data.stars.toLocaleString()}`);
  }
  if (data.last_scanned) {
    lines.push(`**Last Scanned:** ${new Date(data.last_scanned).toLocaleDateString()}`);
  }

  // Findings summary
  if (data.latest_findings && data.latest_findings.length > 0) {
    lines.push("", "### Security Findings");
    for (const f of data.latest_findings.slice(0, 5)) {
      const severity = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡";
      lines.push(`- ${severity} **[${f.severity.toUpperCase()}]** ${f.title}`);
      if (f.recommendation) {
        lines.push(`  → ${f.recommendation}`);
      }
    }
    if (data.latest_findings.length > 5) {
      lines.push(`  ... and ${data.latest_findings.length - 5} more findings`);
    }
  }

  lines.push(
    "",
    `🔗 [Full report on Vigile](https://vigile.dev/server/${encodeURIComponent(data.name)})`
  );

  return lines.join("\n");
}
