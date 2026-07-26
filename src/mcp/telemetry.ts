import type { StandardTelemetryMetadata, TelemetryEmitter } from "@hyperdrift-io/mcp-service-kit/telemetry";

export const DELIVERY_ID = "mcp-maker-001-deputy";

const allowedEvents = new Set([
  "mcp_initialized",
  "mcp_tool_called",
  "http_listening",
  "http_stopping",
  "http_request_failed",
]);
const stringKeys = new Set(["mode", "tool", "client_name", "client_version", "outcome", "host", "signal"]);
const numberKeys = new Set(["duration_ms", "result_count", "port"]);

function safeMetadata(metadata: StandardTelemetryMetadata): Record<string, string | number> {
  const safe: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (stringKeys.has(key) && typeof value === "string") {
      if (key === "mode" && value !== "fixture" && value !== "live") continue;
      if (key === "outcome" && value !== "success" && value !== "error") continue;
      safe[key] = value.slice(0, 200);
    }
    else if (numberKeys.has(key) && typeof value === "number" && Number.isFinite(value)) safe[key] = value;
  }
  return safe;
}

export const emitTelemetry: TelemetryEmitter = (event, metadata = {}) => {
  if (!allowedEvents.has(event)) return;
  process.stderr.write(`${JSON.stringify({
    delivery_id: DELIVERY_ID,
    event,
    ...safeMetadata(metadata),
  })}\n`);
};
