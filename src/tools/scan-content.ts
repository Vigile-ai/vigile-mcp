// ============================================================
// vigile_scan_content — Scan agent skill content inline
// ============================================================

import { fetchVigile, trustLevelEmoji, formatScore } from "./api.js";

export async function scanContent(
  baseUrl: string,
  apiKey: string,
  content: string,
  fileType?: string,
  name?: string
): Promise<string> {
  const body = {
    skill_name: name || "inline-scan",
    content,
    file_type: fileType || "skill.md",
    platform: "claude-code",
    source: "mcp-scan",
  };

  const { ok, status, data } = await fetchVigile(baseUrl, apiKey, "/api/v1/scan/skill", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!ok) {
    if (status === 429) {
      return [
        "**Scan quota exceeded.**",
        "",
        data?.detail || "You've reached your monthly scan limit.",
        "",
        "Upgrade your plan at https://vigile.dev/pricing for more scans.",
      ].join("\n");
    }
    return `Scan failed: ${data?.detail || `HTTP ${status}`}`;
  }

  const emoji = trustLevelEmoji(data.trust_level);
  const lines = [
    `## ${emoji} Scan Result: ${data.skill_name || name || "Inline Scan"}`,
    "",
    `**Trust Score:** ${formatScore(data.trust_score)}`,
    `**Trust Level:** ${data.trust_level}`,
    `**File Type:** ${data.file_type}`,
    `**Findings:** ${data.findings_count} total (${data.critical_count} critical, ${data.high_count} high)`,
  ];

  // Detailed findings
  if (data.findings && data.findings.length > 0) {
    lines.push("", "### Findings");
    for (const f of data.findings) {
      const severity = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡";
      lines.push(``, `#### ${severity} [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(f.description);
      if (f.evidence) {
        lines.push(`**Evidence:** \`${f.evidence}\``);
      }
      if (f.recommendation) {
        lines.push(`**Recommendation:** ${f.recommendation}`);
      }
    }
  } else {
    lines.push("", "✅ No security findings detected.");
  }

  return lines.join("\n");
}
