# Deployment guide

## Deployment boundary

Deploy one instance per Deputy installation. V1 intentionally does not store or route credentials
for multiple customers.

## Required environment

| Variable | Fixture | Live | Purpose |
| --- | --- | --- | --- |
| `DEPUTY_MODE` | `fixture` | `live` | Select the synthetic or Deputy gateway |
| `DEPUTY_BASE_URL` | Optional | Required | Customer installation URL using HTTPS |
| `DEPUTY_ACCESS_TOKEN` | Optional | Required | Customer-owned Deputy OAuth access token |
| `DEPUTY_AUTH_SCHEME` | `Bearer` | `Bearer` | Verified OAuth request scheme |
| `MCP_BEARER_TOKEN` | Required for HTTP | Required for HTTP | At least 32 random bytes |
| `PORT` | `3013` | Operator choice | Loopback listener port |

## Production shape

1. Store secrets in the deployment secret manager, never in the repository or process command
   history.
2. Run `pnpm install --frozen-lockfile`, `pnpm type-check`, `pnpm build`, and
   `pnpm security:scan`.
3. Run `node dist/http.js` as an unprivileged service bound to loopback.
4. Terminate TLS and apply public-network controls at a maintained reverse proxy.
5. Expose `/health` to internal monitoring and require bearer authentication for `/mcp`.
6. Keep logs on stderr and configure an explicit retention period.
7. Rotate credentials and redeploy after any secret change.

## Readiness checks

Verify `GET /health`, unauthenticated `POST /mcp` returns 401, and an authenticated MCP initialize
request succeeds. In live mode, separately exercise all six gateway reads against a Deputy sandbox
and print counts only.

Hyperdrift production deployment is intentionally deferred until the founder approves the live
target and the sandbox verification in `docs/DEPUTY_API.md` is complete.
