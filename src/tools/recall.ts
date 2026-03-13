// ============================================================
// vigile_recall — Query Vigile memory recall
// ============================================================

import { fetchVigile } from "./api.js";

function renderSources(sourceRefs: Array<Record<string, any>>): string[] {
  if (!sourceRefs.length) return ["No source references returned."];
  const lines: string[] = [];
  for (const source of sourceRefs) {
    const line = `- ${source.title || source.source_id} (${source.source_type})`;
    lines.push(line);
    if (source.drilldown_url) {
      lines.push(`  drilldown: ${source.drilldown_url}`);
    } else if (source.url) {
      lines.push(`  url: ${source.url}`);
    }
  }
  return lines;
}

export async function recallMemory(
  baseUrl: string,
  apiKey: string,
  query: string,
  scope?: string[],
  maxChunks?: number,
  riskLevel?: "low" | "medium" | "high",
  retrievalMode?: "default" | "ontology_v1",
): Promise<string> {
  const body = {
    query,
    scope: scope || [],
    max_chunks: Math.min(Math.max(maxChunks || 8, 1), 20),
    risk_level: riskLevel || "low",
    retrieval_mode: retrievalMode || "default",
  };
  const { ok, status, data } = await fetchVigile(baseUrl, apiKey, "/api/v1/memory/search", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!ok) {
    if (status === 403 && data?.detail?.error === "memory_recall_upgrade_required") {
      return [
        "Memory recall requires a Pro plan or above.",
        `Current tier: ${data?.detail?.current_tier || "unknown"}`,
      ].join("\n");
    }
    if (status === 409 && data?.detail?.error === "provenance_incomplete_high_risk") {
      return [
        "High-risk recall request was blocked because provenance is incomplete.",
        `Query: ${data?.detail?.query || query}`,
      ].join("\n");
    }
    return `Memory recall failed: ${data?.detail?.message || data?.detail || `HTTP ${status}`}`;
  }

  const evidence = Array.isArray(data?.evidence) ? data.evidence : [];
  const sourceRefs = Array.isArray(data?.source_refs) ? data.source_refs : [];
  const lines = [
    `## Memory Recall: "${query}"`,
    "",
    data?.answer_context || "No recall context returned.",
    "",
    `Confidence: ${typeof data?.confidence === "number" ? data.confidence.toFixed(2) : "0.00"}`,
    `Provenance Complete: ${Boolean(data?.provenance_complete)}`,
    `Retrieval Mode: ${data?.applied_retrieval_mode || body.retrieval_mode}`,
    "",
    "### Evidence",
  ];

  if (!evidence.length) {
    lines.push("No evidence chunks returned.");
  } else {
    for (const chunk of evidence) {
      lines.push(
        `- [${typeof chunk.score === "number" ? chunk.score.toFixed(2) : "0.00"}] ${chunk.snippet} (source: ${chunk.source_id})`
      );
    }
  }

  lines.push("", "### Sources");
  lines.push(...renderSources(sourceRefs));
  return lines.join("\n");
}
