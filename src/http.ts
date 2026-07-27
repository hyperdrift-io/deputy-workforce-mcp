import { authenticateBearer } from "@hyperdrift-io/mcp-service-kit/auth";
import {
  createMcpHttpServer,
  listenMcpHttpServer,
  TokenRateLimiter,
} from "@hyperdrift-io/mcp-service-kit/http";
import { loadConfig } from "./config.js";
import { createDeputyGateway } from "./deputy/gateway.js";
import { createMcpServer } from "./mcp/server.js";
import { emitTelemetry } from "./mcp/telemetry.js";
import { shutdownMcpAnalytics } from "./mcp/analytics.js";

const config = loadConfig(process.env, "http");
const gateway = createDeputyGateway(config);
const server = createMcpHttpServer({
  port: config.port,
  requestBaseUrl: config.mcpPublicBaseUrl,
  service: "deputy-workforce-mcp",
  version: "0.1.0",
  authenticate: (request) => authenticateBearer(request.headers, config.mcpBearerToken!),
  createServer: () => createMcpServer({
    gateway,
    mode: config.deputyMode,
    analytics: { config, transport: "http" },
  }),
  health: () => ({ deputy_mode: config.deputyMode }),
  rateLimiter: new TokenRateLimiter(),
  onEvent: emitTelemetry,
});

try {
  await listenMcpHttpServer(server, {
    port: config.port,
    service: "deputy-workforce-mcp",
    onEvent: emitTelemetry,
  });
} finally {
  await shutdownMcpAnalytics();
}
