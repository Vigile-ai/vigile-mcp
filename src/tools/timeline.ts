// ============================================================
// vigile_timeline — Query Vigile memory timelines
// ============================================================

import { fetchVigile } from "./api.js";

export async function timelineMemory(
  baseUrl: string,
  apiKey: string,
  selector: { topic?: string; incident_id?: string },
): Promise<string> {
  const body: Record<string, string> = {};
  if (selector.incident_id) {
    body.incident_id = selector.incident_id;
  } else if (selector.topic) {
    body.topic = selector.topic;
  } else {
    return "timeline requires either topic or incident_id.";
  }

  const { ok, status, data } = await fetchVigile(baseUrl, apiKey, "/api/v1/memory/timeline", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!ok) {
    if (status === 403 && data?.detail?.error === "memory_timeline_upgrade_required") {
      return [
        "Memory timeline requires a Pro plan or above.",
        `Current tier: ${data?.detail?.current_tier || "unknown"}`,
      ].join("\n");
    }
    return `Memory timeline failed: ${data?.detail?.message || data?.detail || `HTTP ${status}`}`;
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  const lines = [
    `## Memory Timeline: ${data?.selector || body.incident_id || body.topic}`,
    "",
    data?.answer_context || "No timeline context returned.",
    "",
    `Confidence: ${typeof data?.confidence === "number" ? data.confidence.toFixed(2) : "0.00"}`,
    `Provenance Complete: ${Boolean(data?.provenance_complete)}`,
    "",
    "### Events",
  ];

  if (!events.length) {
    lines.push("No timeline events returned.");
  } else {
    for (const event of events) {
      lines.push(
        `- ${event.timestamp} | ${event.event_type} | ${event.summary} | source: ${event.source_id}`
      );
    }
  }
  return lines.join("\n");
}
