// ============================================================
// vigile_check_provenance — Fetch canonical source payload
// ============================================================

import { fetchVigile } from "./api.js";

export async function checkProvenance(
  baseUrl: string,
  apiKey: string,
  sourceId: string,
): Promise<string> {
  const { ok, status, data } = await fetchVigile(
    baseUrl,
    apiKey,
    `/api/v1/memory/sources/${encodeURIComponent(sourceId)}`
  );

  if (!ok) {
    return `Provenance lookup failed for ${sourceId}: ${data?.detail || `HTTP ${status}`}`;
  }

  const source = data?.source || {};
  const lines = [
    `## Provenance: ${sourceId}`,
    "",
    data?.answer_context || "No provenance context returned.",
    "",
    `Source Type: ${source.source_type || "unknown"}`,
    `Generated At: ${source.generated_at || "unknown"}`,
    `Provenance Complete: ${Boolean(data?.provenance_complete)}`,
    "",
    "### Source Payload",
    "```json",
    JSON.stringify(source.body || {}, null, 2),
    "```",
  ];
  return lines.join("\n");
}
