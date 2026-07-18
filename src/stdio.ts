import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createDeputyGateway } from "./deputy/gateway.js";
import { createMcpServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const config = loadConfig(process.env, "stdio");
  const server = createMcpServer({ gateway: createDeputyGateway(config), mode: config.deputyMode });
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "The MCP server could not start.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
