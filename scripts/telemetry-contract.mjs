#!/usr/bin/env node

import assert from "node:assert/strict";
import { sanitizeMcpEvent } from "../dist/mcp/analytics.js";

const base = {
  distinct_id: "anonymous-session",
  timestamp: "2026-07-27T12:00:00.000Z",
  type: "capture",
};

const safe = sanitizeMcpEvent({
  ...base,
  event: "$mcp_tool_call",
  properties: {
    "$mcp_tool_name": "find_coverage_gaps",
    "$mcp_duration_ms": 12,
    "$mcp_is_error": false,
    "$mcp_parameters": { start_date: "2026-07-20", location_ids: [1] },
    "$mcp_response": { findings: [{ worker_id: 7 }] },
    "$mcp_error_message": "employee@example.com",
    "$mcp_tool_description": "Free text",
    "$mcp_intent": "User intent",
    delivery_id: "mcp-maker-001-deputy",
    deputy_mode: "fixture",
    transport: "stdio",
  },
});

assert.ok(safe);
assert.equal(safe.properties.$mcp_tool_name, "find_coverage_gaps");
assert.equal(safe.properties.delivery_id, "mcp-maker-001-deputy");
assert.equal("$mcp_parameters" in safe.properties, false);
assert.equal("$mcp_response" in safe.properties, false);
assert.equal("$mcp_error_message" in safe.properties, false);
assert.equal("$mcp_tool_description" in safe.properties, false);
assert.equal("$mcp_intent" in safe.properties, false);
assert.equal(sanitizeMcpEvent({ ...base, event: "$exception", properties: {} }), null);

process.stdout.write("Telemetry contract verified: only approved MCP events and properties remain.\n");
