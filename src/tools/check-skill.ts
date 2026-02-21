// ============================================================
// vigile_check_skill — Look up agent skill trust score
// ============================================================

import { fetchVigile, trustLevelEmoji, formatScore } from "./api.js";

export async function checkSkill(
  baseUrl: string,
  apiKey: string,
  name: string
): Promise<string> {
  const { ok, status, data } = await fetchVigile(
    baseUrl,
    apiKey,
    `/api/v1/registry/skills/${encodeURIComponent(name)}`
  );

  if (!ok) {
    if (status === 404) {
      return [
        `## Agent Skill: ${name}`,
        "",
        "**Not found in the Vigile registry.**",
        "",
        "This skill hasn't been scanned yet. You can submit its content for",
        "scanning using the `vigile_scan_content` tool.",
        "",
        "⚠️ An unscanned skill should be reviewed manually before use.",
      ].join("\n");
    }
    return `Error looking up skill "${name}": ${data?.detail || `HTTP ${status}`}`;
  }

  const emoji = trustLevelEmoji(data.trust_level);
  const lines = [
    `## ${emoji} ${data.name}`,
    "",
    `**Trust Score:** ${formatScore(data.trust_score)}`,
    `**Trust Level:** ${data.trust_level}`,
    `**File Type:** ${data.file_type}`,
    `**Platform:** ${data.platform}`,
    `**Source:** ${data.source}`,
  ];

  if (data.description) {
    lines.push(`**Description:** ${data.description}`);
  }
  if (data.author) {
    lines.push(`**Author:** ${data.author}`);
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
  }

  lines.push(
    "",
    `🔗 [Full report on Vigile](https://vigile.dev/skill/${encodeURIComponent(data.name)})`
  );

  return lines.join("\n");
}
