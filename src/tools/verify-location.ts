// ============================================================
// vigile_verify_location — Location risk assessment for agents
// ============================================================
// Part of Vigile Location Guard. Evaluates location-related
// risk for AI agent interactions that involve physical-world
// context (deliveries, services, meetups, etc.).
//
// Accepts either an H3 cell index (privacy-preserving) or
// raw lat/lng coordinates and returns a trust-adjusted risk
// assessment without storing or logging the location.


interface LocationInput {
  h3_cell?: string;
  latitude?: number;
  longitude?: number;
  context?: string;
}

interface LocationRiskResult {
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  factors: string[];
  recommendation: string;
}

/**
 * Assess location risk for an agent interaction.
 *
 * This is a LOCAL assessment — no location data is transmitted to Vigile servers.
 * The tool evaluates the location context and returns guidance for the agent.
 */
export async function verifyLocation(
  baseUrl: string,
  apiKey: string,
  input: LocationInput
): Promise<string> {
  // Determine what location data we have
  const hasH3 = input.h3_cell && input.h3_cell.length > 0;
  const hasCoords = typeof input.latitude === "number" && typeof input.longitude === "number";

  if (!hasH3 && !hasCoords) {
    return [
      "## Location Verification",
      "",
      "**Error:** No location data provided.",
      "",
      "Provide either:",
      "- `h3_cell`: An H3 cell index (preferred, privacy-preserving)",
      "- `latitude` + `longitude`: GPS coordinates",
      "",
      "H3 cells are recommended because they provide area-level precision",
      "without exposing exact coordinates.",
    ].join("\n");
  }

  // Validate coordinates if provided
  if (hasCoords) {
    if (input.latitude! < -90 || input.latitude! > 90) {
      return "**Error:** Latitude must be between -90 and 90.";
    }
    if (input.longitude! < -180 || input.longitude! > 180) {
      return "**Error:** Longitude must be between -180 and 180.";
    }
  }

  // Validate H3 cell format (15-character hex string)
  if (hasH3 && !/^[0-9a-fA-F]{15}$/.test(input.h3_cell!)) {
    return [
      "**Error:** Invalid H3 cell index format.",
      "",
      "H3 cell indexes are 15-character hexadecimal strings.",
      "Example: `8928308280fffff`",
    ].join("\n");
  }

  // Perform local risk assessment
  const result = assessLocationRisk(input);

  const locationDesc = hasH3
    ? `H3 Cell: ${input.h3_cell}`
    : `Coordinates: ${input.latitude!.toFixed(4)}, ${input.longitude!.toFixed(4)}`;

  const riskEmoji: Record<string, string> = {
    low: "OK",
    medium: "CAUTION",
    high: "WARNING",
    critical: "DANGER",
  };

  const lines = [
    `## Location Risk Assessment`,
    "",
    `**${riskEmoji[result.risk_level]}** Risk Level: ${result.risk_level.toUpperCase()}`,
    `**Risk Score:** ${result.risk_score}/100`,
    `**Location:** ${locationDesc}`,
  ];

  if (input.context) {
    lines.push(`**Context:** ${input.context}`);
  }

  if (result.factors.length > 0) {
    lines.push("", "### Risk Factors");
    for (const factor of result.factors) {
      lines.push(`- ${factor}`);
    }
  }

  lines.push("", "### Recommendation", result.recommendation);

  lines.push(
    "",
    "---",
    "*This assessment was performed locally. No location data was transmitted to Vigile servers.*"
  );

  return lines.join("\n");
}

/**
 * Local risk assessment logic. No network calls.
 *
 * Risk factors considered:
 * - Whether exact coordinates were provided (higher risk than H3 cells)
 * - Context of the interaction (financial, physical meetup, delivery)
 * - General location privacy principles
 */
function assessLocationRisk(input: LocationInput): LocationRiskResult {
  const factors: string[] = [];
  let riskScore = 20; // Base risk — any location sharing has inherent risk

  // Exact coordinates are higher risk than H3 cells
  const hasCoords = typeof input.latitude === "number" && typeof input.longitude === "number";
  const hasH3 = input.h3_cell && input.h3_cell.length > 0;

  if (hasCoords && !hasH3) {
    riskScore += 15;
    factors.push("Exact GPS coordinates provided (consider using H3 cells for better privacy)");
  } else if (hasH3) {
    factors.push("H3 cell index used (privacy-preserving area-level precision)");
  }

  // Analyze context for risk indicators
  const ctx = (input.context || "").toLowerCase();

  if (/(?:payment|financial|money|transaction|purchase|buy|sell)/.test(ctx)) {
    riskScore += 20;
    factors.push("Financial transaction context increases risk of location-targeted fraud");
  }

  if (/(?:meet|meetup|in-person|physical|face.to.face|pickup|drop.off)/.test(ctx)) {
    riskScore += 25;
    factors.push("In-person interaction — physical safety considerations apply");
  }

  if (/(?:deliver|shipping|address|home|residence|apartment)/.test(ctx)) {
    riskScore += 20;
    factors.push("Delivery/residential context — location data reveals home address");
  }

  if (/(?:child|minor|kid|school|playground)/.test(ctx)) {
    riskScore += 30;
    factors.push("Minor/child safety context — heightened location privacy requirements");
  }

  if (/(?:medical|health|hospital|clinic|pharmacy)/.test(ctx)) {
    riskScore += 15;
    factors.push("Medical context — location may reveal sensitive health information (HIPAA considerations)");
  }

  // Cap at 100
  riskScore = Math.min(riskScore, 100);

  // Determine risk level
  let risk_level: LocationRiskResult["risk_level"];
  if (riskScore <= 30) risk_level = "low";
  else if (riskScore <= 50) risk_level = "medium";
  else if (riskScore <= 75) risk_level = "high";
  else risk_level = "critical";

  // Generate recommendation
  let recommendation: string;
  if (risk_level === "low") {
    recommendation = "Location context appears low-risk. Standard privacy practices apply — avoid storing or logging location data beyond the immediate need.";
  } else if (risk_level === "medium") {
    recommendation = "Moderate location risk. Use H3 cells instead of exact coordinates when possible. Minimize location data retention and ensure the user consented to location sharing.";
  } else if (risk_level === "high") {
    recommendation = "High location risk detected. Consider whether location data is truly necessary for this interaction. If proceeding, use area-level precision only (H3 resolution 6 or lower), require explicit user consent, and do not store location data.";
  } else {
    recommendation = "Critical location risk. This interaction involves sensitive context where location exposure could cause harm. Strongly recommend against sharing precise location. If location is required, use the coarsest precision possible and implement additional safety measures.";
  }

  if (factors.length === 0) {
    factors.push("No specific risk factors identified beyond baseline location sharing risk");
  }

  return { risk_level, risk_score: riskScore, factors, recommendation };
}
