import { runStdioServer } from "@hyperdrift-io/mcp-service-kit/stdio";
import { loadConfig } from "./config.js";
import { createDeputyGateway } from "./deputy/gateway.js";
import { createMcpServer } from "./mcp/server.js";

const config = loadConfig(process.env, "stdio");

await runStdioServer(
  () => createMcpServer({ gateway: createDeputyGateway(config), mode: config.deputyMode }),
  { fallbackMessage: "The Deputy MCP server could not start." },
);
