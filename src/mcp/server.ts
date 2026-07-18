import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { DeputyMode } from "../config.js";
import type { DeputyGateway } from "../deputy/contracts.js";
import type { DateRange, ToolResult } from "../types.js";
import { findAvailabilityConflicts } from "../workflows/conflicts.js";
import { findCoverageGaps } from "../workflows/coverage.js";
import { flagOvertimeRisk } from "../workflows/overtime.js";
import { summariseStaffing } from "../workflows/staffing.js";
import { listTimesheetExceptions } from "../workflows/timesheets.js";
import { enablingError, successfulResult } from "./results.js";
import { emitTelemetry } from "./telemetry.js";

export interface McpContext {
  gateway: DeputyGateway;
  mode: DeputyMode;
}
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const commonInput = {
  start_date: z.string().regex(datePattern).describe("First local calendar date, YYYY-MM-DD."),
  end_date: z.string().regex(datePattern).describe("Last local calendar date, YYYY-MM-DD, inclusive."),
  timezone: z.string().min(1).describe("IANA timezone used to group operational days."),
  location_ids: z.array(z.number().int().positive()).max(50).optional(),
};

function dateRange(startDate: string, endDate: string, timezone: string): DateRange {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("Use a valid IANA timezone such as Europe/London or Australia/Sydney.");
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const inclusiveEnd = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(inclusiveEnd.getTime()) || inclusiveEnd < start) {
    throw new Error("Choose an end date on or after the start date.");
  }
  const end = new Date(inclusiveEnd.getTime() + 86_400_000);
  if ((end.getTime() - start.getTime()) / 86_400_000 > 31) {
    throw new Error("Choose a period of 31 days or fewer so the Deputy read stays bounded.");
  }
  return { start: start.toISOString(), end: end.toISOString(), timezone };
}

function clientInfo(server: McpServer): { client_name: string; client_version: string } {
  const client = server.server.getClientVersion();
  return {
    client_name: client?.name ?? "unknown",
    client_version: client?.version ?? "unknown",
  };
}

async function callTool(
  server: McpServer,
  context: McpContext,
  tool: string,
  operation: () => Promise<ToolResult>,
): Promise<CallToolResult> {
  const started = performance.now();
  try {
    const result = await operation();
    emitTelemetry({
      event: "mcp_tool_called",
      mode: context.mode,
      tool,
      ...clientInfo(server),
      duration_ms: Math.round(performance.now() - started),
      outcome: "success",
      result_count: result.findings.length,
    });
    return successfulResult(result);
  } catch (error) {
    emitTelemetry({
      event: "mcp_tool_called",
      mode: context.mode,
      tool,
      ...clientInfo(server),
      duration_ms: Math.round(performance.now() - started),
      outcome: "error",
      result_count: 0,
    });
    return enablingError(error);
  }
}

export function createMcpServer(context: McpContext): McpServer {
  const server = new McpServer({
    name: "deputy-workforce-mcp",
    version: "0.1.0",
  });

  emitTelemetry({ event: "mcp_initialized", mode: context.mode });

  server.registerTool(
    "find_coverage_gaps",
    {
      title: "Find coverage gaps",
      description: "Find open shifts and optional minimum-staffing shortfalls without changing Deputy data.",
      inputSchema: { ...commonInput, minimum_people: z.number().int().positive().max(100).optional() },
      annotations,
    },
    ({ start_date, end_date, timezone, location_ids, minimum_people }) => callTool(
      server,
      context,
      "find_coverage_gaps",
      () => findCoverageGaps({
        range: dateRange(start_date, end_date, timezone),
        ...(location_ids ? { locationIds: location_ids } : {}),
        ...(minimum_people ? { minimumPeople: minimum_people } : {}),
      }, context.gateway),
    ),
  );

  server.registerTool(
    "flag_overtime_risk",
    {
      title: "Flag workload threshold",
      description: "Compare completed and remaining rostered hours with a configured operational threshold.",
      inputSchema: { ...commonInput, threshold_hours: z.number().positive().max(168).default(40) },
      annotations,
    },
    ({ start_date, end_date, timezone, location_ids, threshold_hours }) => callTool(
      server,
      context,
      "flag_overtime_risk",
      () => flagOvertimeRisk({
        range: dateRange(start_date, end_date, timezone),
        ...(location_ids ? { locationIds: location_ids } : {}),
        thresholdHours: threshold_hours,
      }, context.gateway),
    ),
  );

  server.registerTool(
    "list_timesheet_exceptions",
    {
      title: "List timesheet exceptions",
      description: "Find missing or materially different timesheets using an explicit tolerance.",
      inputSchema: { ...commonInput, tolerance_minutes: z.number().nonnegative().max(720).default(15) },
      annotations,
    },
    ({ start_date, end_date, timezone, location_ids, tolerance_minutes }) => callTool(
      server,
      context,
      "list_timesheet_exceptions",
      () => listTimesheetExceptions({
        range: dateRange(start_date, end_date, timezone),
        ...(location_ids ? { locationIds: location_ids } : {}),
        toleranceMinutes: tolerance_minutes,
      }, context.gateway),
    ),
  );

  server.registerTool(
    "find_availability_conflicts",
    {
      title: "Find availability conflicts",
      description: "Find rosters overlapping recorded unavailability or approved leave.",
      inputSchema: commonInput,
      annotations,
    },
    ({ start_date, end_date, timezone, location_ids }) => callTool(
      server,
      context,
      "find_availability_conflicts",
      () => findAvailabilityConflicts({
        range: dateRange(start_date, end_date, timezone),
        ...(location_ids ? { locationIds: location_ids } : {}),
      }, context.gateway),
    ),
  );

  server.registerTool(
    "summarise_staffing",
    {
      title: "Summarise staffing",
      description: "Summarise rostered and completed staffing by location and local day.",
      inputSchema: commonInput,
      annotations,
    },
    ({ start_date, end_date, timezone, location_ids }) => callTool(
      server,
      context,
      "summarise_staffing",
      () => summariseStaffing({
        range: dateRange(start_date, end_date, timezone),
        ...(location_ids ? { locationIds: location_ids } : {}),
      }, context.gateway),
    ),
  );

  return server;
}
