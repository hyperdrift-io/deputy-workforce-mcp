export type DeputyMode = "fixture" | "live";
export type TransportKind = "stdio" | "http";

export interface Config {
  nodeEnv: string;
  port: number;
  deputyMode: DeputyMode;
  deputyBaseUrl?: string;
  deputyAccessToken?: string;
  deputyAuthScheme: "Bearer" | "OAuth";
  mcpBearerToken?: string;
  mcpPublicBaseUrl: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3013");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  transport: TransportKind = "stdio",
): Config {
  const deputyMode = env.DEPUTY_MODE === "live" ? "live" : "fixture";
  const deputyBaseUrl = optionalValue(env.DEPUTY_BASE_URL)?.replace(/\/$/, "");
  const deputyAccessToken = optionalValue(env.DEPUTY_ACCESS_TOKEN);
  const mcpBearerToken = optionalValue(env.MCP_BEARER_TOKEN);

  if (deputyMode === "live" && (!deputyBaseUrl || !deputyAccessToken)) {
    throw new Error(
      "Live Deputy mode needs DEPUTY_BASE_URL and DEPUTY_ACCESS_TOKEN. Use fixture mode until both are available.",
    );
  }

  if (deputyBaseUrl) {
    const parsed = new URL(deputyBaseUrl);
    if (parsed.protocol !== "https:") {
      throw new Error("DEPUTY_BASE_URL must use HTTPS.");
    }
  }

  if (transport === "http" && (!mcpBearerToken || Buffer.byteLength(mcpBearerToken) < 32)) {
    throw new Error("Remote MCP needs MCP_BEARER_TOKEN containing at least 32 bytes.");
  }

  const authScheme = env.DEPUTY_AUTH_SCHEME === "OAuth" ? "OAuth" : "Bearer";
  const allowedLogLevels = new Set(["debug", "info", "warn", "error"]);
  const requestedLogLevel = env.LOG_LEVEL ?? "info";
  const logLevel = allowedLogLevels.has(requestedLogLevel)
    ? (requestedLogLevel as Config["logLevel"])
    : "info";

  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: parsePort(env.PORT),
    deputyMode,
    ...(deputyBaseUrl ? { deputyBaseUrl } : {}),
    ...(deputyAccessToken ? { deputyAccessToken } : {}),
    deputyAuthScheme: authScheme,
    ...(mcpBearerToken ? { mcpBearerToken } : {}),
    mcpPublicBaseUrl: env.MCP_PUBLIC_BASE_URL ?? "http://127.0.0.1:3013",
    logLevel,
  };
}
