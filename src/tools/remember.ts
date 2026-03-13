// ============================================================
// vigile_remember — Write bounded memory episodes
// ============================================================

import { randomUUID } from "node:crypto";
import { fetchVigile } from "./api.js";

type RememberInput = {
  event_type: string;
  entity_id?: string;
  summary?: string;
  adapter_type?: "event" | "evidence" | "incident" | "advisory";
  sensitivity?: "standard" | "restricted";
  payload?: Record<string, any>;
  source_refs?: Array<{
    source_id: string;
    source_type: "incident" | "finding" | "event" | "scan" | "advisory" | "rule" | "episode" | "external";
    title: string;
    url?: string;
    metadata?: Record<string, any>;
  }>;
  idempotency_key?: string;
};

export async function rememberMemory(
  baseUrl: string,
  apiKey: string,
  input: RememberInput,
): Promise<string> {
  const idempotencyKey = input.idempotency_key || `mcp_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const body = {
    idempotency_key: idempotencyKey,
    adapter_type: input.adapter_type || "event",
    event_type: input.event_type,
    timestamp: new Date().toISOString(),
    entity_id: input.entity_id,
    summary: input.summary,
    sensitivity: input.sensitivity || "standard",
    payload: input.payload || {},
    source_refs: input.source_refs || [],
  };

  const { ok, status, data } = await fetchVigile(baseUrl, apiKey, "/api/v1/memory/episodes", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!ok) {
    return `Memory write failed: ${data?.detail || `HTTP ${status}`}`;
  }

  return [
    "## Memory Episode Recorded",
    "",
    `Episode ID: ${data?.episode_id}`,
    `Status: ${data?.status}`,
    `Retention Days: ${data?.retention_days ?? "n/a"}`,
    `Redactions Applied: ${data?.redaction_count ?? 0}`,
    `Idempotent Replay: ${Boolean(data?.idempotent)}`,
  ].join("\n");
}
