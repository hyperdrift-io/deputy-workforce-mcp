import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
export function authenticateBearer(
  headers: IncomingHttpHeaders,
  expectedToken: string,
): { authenticated: true; tokenDigest: string } | { authenticated: false } {
  const authorization = headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return { authenticated: false };
  const suppliedToken = authorization.slice("Bearer ".length);
  const suppliedDigest = digest(suppliedToken);
  const expectedDigest = digest(expectedToken);
  if (!timingSafeEqual(suppliedDigest, expectedDigest)) return { authenticated: false };
  return { authenticated: true, tokenDigest: suppliedDigest.toString("hex") };
}
