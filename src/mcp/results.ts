import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { OperationalFinding, ToolResult } from "../types.js";

export function successfulResult(result: ToolResult): CallToolResult {
  const detail = result.findings.slice(0, 10).map((finding) => `- ${finding.summary}`).join("\n");
  const limitText = result.limits.length ? `\n\nLimits:\n${result.limits.map((limit) => `- ${limit}`).join("\n")}` : "";
  return {
    content: [{ type: "text", text: `${result.summary}${detail ? `\n\n${detail}` : ""}${limitText}` }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}
export function enablingError(error: unknown): CallToolResult {
  const message = error instanceof Error
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
