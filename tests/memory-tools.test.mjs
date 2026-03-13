import test from "node:test";
import assert from "node:assert/strict";

import { recallMemory } from "../dist/tools/recall.js";
import { timelineMemory } from "../dist/tools/timeline.js";
import { checkProvenance } from "../dist/tools/check-provenance.js";
import { rememberMemory } from "../dist/tools/remember.js";

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
  };
}

async function withMockedFetch(responders, fn) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (!responders.length) {
      throw new Error("Unexpected fetch invocation");
    }
    const next = responders.shift();
    return next(url, options);
  };

  try {
    await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("recallMemory renders context, evidence, and retrieval mode", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(200, {
          answer_context: "Matched incident history",
          confidence: 0.91,
          provenance_complete: true,
          applied_retrieval_mode: "ontology_v1",
          evidence: [
            {
              score: 0.87,
              snippet: "source relation matched",
              source_id: "src_incident_123",
            },
          ],
          source_refs: [
            {
              source_id: "src_incident_123",
              source_type: "incident",
              title: "Incident 123",
              drilldown_url: "/api/v1/memory/sources/src_incident_123",
            },
          ],
        }),
    ],
    async (calls) => {
      const output = await recallMemory(
        "https://api.vigile.dev",
        "test_key",
        "incident src_incident_123",
        ["incident"],
        999,
        "high",
        "ontology_v1",
      );

      assert.match(output, /Matched incident history/);
      assert.match(output, /Retrieval Mode: ontology_v1/);
      assert.match(output, /source relation matched/);
      assert.match(output, /drilldown: \/api\/v1\/memory\/sources\/src_incident_123/);

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.vigile.dev/api/v1/memory/search");
      const body = JSON.parse(calls[0].options.body);
      assert.equal(body.max_chunks, 20);
      assert.equal(body.retrieval_mode, "ontology_v1");
      assert.equal(body.risk_level, "high");
      assert.equal(calls[0].options.headers.Authorization, "Bearer test_key");
    },
  );
});

test("recallMemory returns upgrade message for free tier", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(403, {
          detail: {
            error: "memory_recall_upgrade_required",
            current_tier: "free",
          },
        }),
    ],
    async () => {
      const output = await recallMemory("https://api.vigile.dev", "", "recent incident");
      assert.match(output, /requires a Pro plan/);
      assert.match(output, /Current tier: free/);
    },
  );
});

test("recallMemory returns fail-closed message when provenance is incomplete", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(409, {
          detail: {
            error: "provenance_incomplete_high_risk",
            query: "rotate keys",
          },
        }),
    ],
    async () => {
      const output = await recallMemory("https://api.vigile.dev", "", "rotate keys");
      assert.match(output, /blocked because provenance is incomplete/);
      assert.match(output, /Query: rotate keys/);
    },
  );
});

test("timelineMemory requires selector", async () => {
  const output = await timelineMemory("https://api.vigile.dev", "", {});
  assert.equal(output, "timeline requires either topic or incident_id.");
});

test("timelineMemory renders events and provenance summary", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(200, {
          selector: "inc_42",
          answer_context: "Timeline loaded",
          confidence: 0.8,
          provenance_complete: true,
          events: [
            {
              timestamp: "2026-03-12T00:00:00Z",
              event_type: "incident_opened",
              summary: "Initial report",
              source_id: "src_inc_42",
            },
          ],
        }),
    ],
    async (calls) => {
      const output = await timelineMemory("https://api.vigile.dev", "", { incident_id: "inc_42" });
      assert.match(output, /Memory Timeline: inc_42/);
      assert.match(output, /incident_opened/);
      assert.match(output, /source: src_inc_42/);
      const body = JSON.parse(calls[0].options.body);
      assert.equal(body.incident_id, "inc_42");
    },
  );
});

test("checkProvenance renders source payload", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(200, {
          answer_context: "Source payload retrieved",
          provenance_complete: true,
          source: {
            source_type: "incident",
            generated_at: "2026-03-12T00:00:00Z",
            body: { incident_id: "inc_99", severity: "high" },
          },
        }),
    ],
    async () => {
      const output = await checkProvenance("https://api.vigile.dev", "", "src_99");
      assert.match(output, /Provenance: src_99/);
      assert.match(output, /Source Type: incident/);
      assert.match(output, /"incident_id": "inc_99"/);
    },
  );
});

test("checkProvenance returns failure message on non-200", async () => {
  await withMockedFetch(
    [() => jsonResponse(404, { detail: "source not found" })],
    async () => {
      const output = await checkProvenance("https://api.vigile.dev", "", "src_missing");
      assert.equal(output, "Provenance lookup failed for src_missing: source not found");
    },
  );
});

test("rememberMemory posts bounded payload and renders response", async () => {
  await withMockedFetch(
    [
      () =>
        jsonResponse(200, {
          episode_id: "ep_123",
          status: "created",
          retention_days: 90,
          redaction_count: 1,
          idempotent: false,
        }),
    ],
    async (calls) => {
      const output = await rememberMemory("https://api.vigile.dev", "api_key", {
        event_type: "policy_update",
        summary: "Updated retention defaults",
        payload: { key: "value" },
      });

      assert.match(output, /Memory Episode Recorded/);
      assert.match(output, /Episode ID: ep_123/);
      assert.match(output, /Retention Days: 90/);
      assert.match(output, /Idempotent Replay: false/);

      const req = calls[0];
      assert.equal(req.url, "https://api.vigile.dev/api/v1/memory/episodes");
      const body = JSON.parse(req.options.body);
      assert.equal(body.adapter_type, "event");
      assert.equal(body.sensitivity, "standard");
      assert.match(body.idempotency_key, /^mcp_[a-z0-9]{20}$/);
      assert.equal(req.options.headers.Authorization, "Bearer api_key");
    },
  );
});
