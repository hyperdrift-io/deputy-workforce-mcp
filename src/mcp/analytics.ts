import { instrument } from "@posthog/mcp";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PostHog } from "posthog-node";
import type { Config, TransportKind } from "../config.js";
import { DELIVERY_ID } from "./telemetry.js";

const allowedEvents = new Set([
  "$mcp_initialize",
  "$mcp_tools_list",
  "$mcp_tool_call",
]);

const allowedProperties = new Set([
  "$mcp_source",
  "$session_id",
  "$process_person_profile",
  "$mcp_resource_name",
  "$mcp_tool_name",
  "$mcp_listed_tool_names",
  "$mcp_duration_ms",
  "$mcp_server_name",
  "$mcp_server_version",
  "$mcp_client_name",
  "$mcp_client_version",
  "$mcp_protocol_version",
  "$mcp_is_error",
  "$mcp_error_type",
  "delivery_id",
  "deputy_mode",
  "transport",
]);

export interface McpCaptureEvent {
  distinct_id: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  type: "capture";
}

let client: PostHog | undefined;

export function sanitizeMcpEvent(event: McpCaptureEvent): McpCaptureEvent | null {
  if (!allowedEvents.has(event.event)) return null;
  const properties = Object.fromEntries(
    Object.entries(event.properties).filter(([key]) => allowedProperties.has(key)),
  );
  return { ...event, properties };
}

function posthogClient(config: Config): PostHog | undefined {
  if (!config.posthogProjectToken) return undefined;
  if (!client) {
    client = new PostHog(config.posthogProjectToken, {
      host: config.posthogHost,
      flushAt: 1,
      flushInterval: 0,
      disableGeoip: true,
    });
  }
  return client;
}

export function instrumentMcpAnalytics(
  server: McpServer,
  config: Config,
  transport: TransportKind,
): void {
  const posthog = posthogClient(config);
  if (!posthog) return;
  instrument(server, posthog, {
    enableExceptionAutocapture: false,
    identify: null,
    eventProperties: () => ({
      delivery_id: DELIVERY_ID,
      deputy_mode: config.deputyMode,
      transport,
    }),
    beforeSend: (event) => sanitizeMcpEvent(event),
  });
}

export async function shutdownMcpAnalytics(): Promise<void> {
  const activeClient = client;
  client = undefined;
  if (!activeClient) return;
  try {
    await activeClient.shutdown();
  } catch {
    // Analytics must never interfere with MCP shutdown.
  }
}
