import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1_048_576;

export class RequestBodyTooLargeError extends Error {}

export async function readBoundedBody(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new RequestBodyTooLargeError("Request body exceeds 1 MiB.");
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
export function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

export async function sendWebResponse(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  if (!response.body) {
    target.end();
    return;
  }
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!target.write(value)) await new Promise<void>((resolve) => target.once("drain", resolve));
    }
    target.end();
  } finally {
    reader.releaseLock();
  }
}

export function jsonResponse(target: ServerResponse, status: number, payload: unknown): void {
  target.statusCode = status;
  target.setHeader("Content-Type", "application/json; charset=utf-8");
  target.end(`${JSON.stringify(payload)}\n`);
}
