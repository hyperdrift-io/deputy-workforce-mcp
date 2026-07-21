import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { loadConfig } from "./config.js";
import { createDeputyGateway } from "./deputy/gateway.js";
import { authenticateBearer } from "./http/auth.js";
import { TokenRateLimiter } from "./http/rate-limit.js";
import {
  jsonResponse,
  readBoundedBody,
  RequestBodyTooLargeError,
  requestHeaders,
  sendWebResponse,
} from "./http/request.js";
import { createMcpServer } from "./mcp/server.js";

const config = loadConfig(process.env, "http");
const gateway = createDeputyGateway(config);
const limiter = new TokenRateLimiter();

function requestUrl(request: IncomingMessage): URL {
  const host = request.headers.host ?? `127.0.0.1:${config.port}`;
  return new URL(request.url ?? "/", `http://${host}`);
}

async function handleMcp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const auth = authenticateBearer(request.headers, config.mcpBearerToken!);
  if (!auth.authenticated) {
    response.setHeader("WWW-Authenticate", "Bearer");
    jsonResponse(response, 401, { error: "unauthorized" });
    return;
  }
  if (!limiter.allow(auth.tokenDigest)) {
    response.setHeader("Retry-After", "60");
    jsonResponse(response, 429, { error: "rate_limited" });
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    jsonResponse(response, 405, { error: "method_not_allowed" });
    return;
  }
  try {
    const body = await readBoundedBody(request);
    const webRequest = new Request(requestUrl(request), {
      method: "POST",
      headers: requestHeaders(request),
      body: Buffer.from(body).toString("utf8"),
    });
    const transport = new WebStandardStreamableHTTPServerTransport();
    const mcpServer = createMcpServer({ gateway, mode: config.deputyMode });
    await mcpServer.connect(transport);
    try {
      const webResponse = await transport.handleRequest(webRequest);
      await sendWebResponse(webResponse, response);
    } finally {
      await mcpServer.close();
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      jsonResponse(response, 413, { error: "request_too_large" });
      return;
    }
    if (!response.headersSent) jsonResponse(response, 500, { error: "request_failed" });
    else response.destroy();
  }
}

const server = createServer((request, response) => {
  const pathname = requestUrl(request).pathname;
  if (pathname === "/health" && request.method === "GET") {
    jsonResponse(response, 200, {
      status: "ok",
      service: "deputy-workforce-mcp",
      version: "0.1.0",
      deputy_mode: config.deputyMode,
    });
    return;
  }
  if (pathname === "/mcp") {
    void handleMcp(request, response);
    return;
  }
  jsonResponse(response, 404, { error: "not_found" });
});

server.listen(config.port, "127.0.0.1", () => {
  process.stderr.write(`${JSON.stringify({
    occurred_at: new Date().toISOString(),
    event: "http_listening",
    service: "deputy-workforce-mcp",
    port: config.port,
    deputy_mode: config.deputyMode,
  })}\n`);
});

function shutdown(signal: string): void {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
  process.stderr.write(`${JSON.stringify({ event: "http_stopping", signal })}\n`);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
