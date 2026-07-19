import type { Config } from "../config.js";

const MAX_PAGE_SIZE = 500;
const MAX_PAGES = 10;

export class DeputyGatewayError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "DeputyGatewayError";
  }
}

export class DeputyPartialResultError extends DeputyGatewayError {
  constructor(
    readonly resource: string,
    readonly recordCount: number,
  ) {
    super(
      `Deputy returned ${recordCount} ${resource} records across the maximum ${MAX_PAGES} pages. `
        + "The read may be partial, so no result was returned as complete. Narrow the date range or location selection.",
    );
    this.name = "DeputyPartialResultError";
  }
}
export type DeputyRecord = Record<string, unknown>;
export type DeputyQuery = Record<string, unknown>;

function retryDelay(response: Response): number {
  const header = response.headers.get("retry-after");
  if (!header) return 500;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), 10_000);
  const dateDelay = Date.parse(header) - Date.now();
  return Number.isFinite(dateDelay) ? Math.min(Math.max(dateDelay, 0), 10_000) : 500;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function enablingError(status: number): DeputyGatewayError {
  if (status === 401 || status === 403) {
    return new DeputyGatewayError(
      "Deputy access needs attention. Confirm the installation URL, token, consent, and read permissions.",
      status,
    );
  }
  if (status === 429) {
    return new DeputyGatewayError(
      "Deputy is limiting requests. Wait for the indicated retry window, then try again.",
      status,
    );
  }
  if (status >= 500) {
    return new DeputyGatewayError(
      "Deputy is temporarily unavailable. Existing data is unchanged; retry after its service recovers.",
      status,
    );
  }
  return new DeputyGatewayError(
    `Deputy could not complete this read request (HTTP ${status}). Check the documented resource permissions.`,
    status,
  );
}

export class DeputyClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly authScheme: string;

  constructor(config: Config) {
    if (!config.deputyBaseUrl || !config.deputyAccessToken) {
      throw new Error("DeputyClient requires live Deputy configuration.");
    }
    this.baseUrl = config.deputyBaseUrl;
    this.accessToken = config.deputyAccessToken;
    this.authScheme = config.deputyAuthScheme;
  }

  async queryResource(resource: string, query: DeputyQuery = {}): Promise<DeputyRecord[]> {
    const records: DeputyRecord[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const body = { ...query, start: page * MAX_PAGE_SIZE, max: MAX_PAGE_SIZE };
      const pageRecords = await this.requestPage(resource, body);
      records.push(...pageRecords);
      if (pageRecords.length < MAX_PAGE_SIZE) return records;
    }

    throw new DeputyPartialResultError(resource, records.length);
  }

  private async requestPage(resource: string, body: DeputyQuery): Promise<DeputyRecord[]> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/api/v1/resource/${resource}/QUERY`, {
          method: "POST",
          headers: {
            Authorization: `${this.authScheme} ${this.accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") {
          throw new DeputyGatewayError(
            "Deputy did not respond within 10 seconds. Try a narrower request or retry shortly.",
          );
        }
        throw new DeputyGatewayError("Deputy could not be reached. Confirm the installation URL and network access.");
      }

      if (response.ok) {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch (error) {
          if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
            throw new DeputyGatewayError(
              "Deputy did not respond within 10 seconds. Try a narrower request or retry shortly.",
            );
          }
          throw new DeputyGatewayError("Deputy returned an unexpected read response shape.");
        }
        if (!Array.isArray(payload)
          || payload.some((item) => typeof item !== "object" || item === null || Array.isArray(item))) {
          throw new DeputyGatewayError("Deputy returned an unexpected read response shape.");
        }
        return payload as DeputyRecord[];
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt === 0) {
        await wait(retryDelay(response));
        continue;
      }
      throw enablingError(response.status);
    }
    throw new DeputyGatewayError("Deputy could not complete the read request.");
  }
}
