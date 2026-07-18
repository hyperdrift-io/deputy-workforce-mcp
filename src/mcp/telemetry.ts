export const DELIVERY_ID = "mcp-maker-001-deputy";

interface TelemetryEvent {
  event: "mcp_initialized" | "mcp_tool_called";
  mode: "fixture" | "live";
  tool?: string;
  client_name?: string;
  client_version?: string;
  duration_ms?: number;
  outcome?: "success" | "error";
  result_count?: number;
}
export function emitTelemetry(event: TelemetryEvent): void {
  process.stderr.write(`${JSON.stringify({
    occurred_at: new Date().toISOString(),
    delivery_id: DELIVERY_ID,
    ...event,
  })}\n`);
}
