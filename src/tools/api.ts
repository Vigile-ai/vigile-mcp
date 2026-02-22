// ============================================================
// Vigile MCP — API Client Helper
// ============================================================

export async function fetchVigile(
  baseUrl: string,
  apiKey: string,
  path: string,
  options?: { method?: string; body?: string }
): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "vigile-mcp/0.1.0",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
    });

    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    // Sanitize error message — don't leak internal details like
    // hostnames, ports, file paths, or stack traces
    const rawMsg = error?.message || "Unknown error";
    const safeMsg = rawMsg.includes("ECONNREFUSED") || rawMsg.includes("ENOTFOUND")
      ? "API server unreachable"
      : rawMsg.includes("ETIMEDOUT") || rawMsg.includes("timeout")
      ? "Request timed out"
      : rawMsg.includes("ECONNRESET")
      ? "Connection reset"
      : "Connection failed";
    return {
      ok: false,
      status: 0,
      data: { detail: safeMsg },
    };
  }
}

export function trustLevelEmoji(level: string): string {
  switch (level) {
    case "trusted":
      return "🟢";
    case "caution":
      return "🟡";
    case "risky":
      return "🟠";
    case "dangerous":
      return "🔴";
    default:
      return "⚪";
  }
}

export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}
