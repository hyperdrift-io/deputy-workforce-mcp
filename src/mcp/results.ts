import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { structuredToolResult } from "@hyperdrift-io/mcp-service-kit/results";
import { DeputyGatewayError } from "../deputy/client.js";
import type { OperationalFinding, ToolResult } from "../types.js";

export class EnablingToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnablingToolError";
  }
}

export function successfulResult(result: ToolResult): CallToolResult {
  const detail = result.findings.slice(0, 10).map((finding) => `- ${finding.summary}`).join("\n");
  const limitText = result.limits.length ? `\n\nLimits:\n${result.limits.map((limit) => `- ${limit}`).join("\n")}` : "";
  const structured = {
    period: result.period,
    timezone: result.period.timezone,
    findings: result.findings,
    sources: result.sources,
    limits: result.limits,
  };
  return structuredToolResult(
    structured,
    () => `${result.summary}${detail ? `\n\n${detail}` : ""}${limitText}`,
  );
}
export function enablingError(error: unknown): CallToolResult {
  const message = error instanceof DeputyGatewayError || error instanceof EnablingToolError
    ? error.message
    : "The workforce read could not be completed. Check the connection and try again.";
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function findingCount(result: ToolResult<OperationalFinding>): number {
  return result.findings.length;
}
