import { runStdioServer } from "@hyperdrift-io/mcp-service-kit/stdio";
import { loadConfig } from "./config.js";
import { createDeputyGateway } from "./deputy/gateway.js";
import { createMcpServer } from "./mcp/server.js";
import { shutdownMcpAnalytics } from "./mcp/analytics.js";

const config = loadConfig(process.env, "stdio");

try {
  await runStdioServer(
    () => createMcpServer({
      gateway: createDeputyGateway(config),
      mode: config.deputyMode,
      analytics: { config, transport: "stdio" },
    }),
    { fallbackMessage: "The Deputy MCP server could not start." },
  );
} finally {
  await shutdownMcpAnalytics();
}
