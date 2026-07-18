# Security policy

## Supported versions

Security updates apply to the latest published minor version. This project is currently in
prototype discovery; pin a reviewed version in production rather than tracking `main`.

## Report a vulnerability privately

Use the repository's **Security** tab to open a private GitHub security advisory. Do not include
access tokens, employee data, or customer installation details in a public issue.

## Security boundary

- All MCP tools are implemented as read-only Deputy operations.
- Live mode accepts a customer-owned Deputy OAuth token through the deployment environment.
- Remote MCP authenticates bearer tokens before reading the request body.
- Token comparison uses SHA-256 digests and constant-time comparison.
- Request bodies are limited to 1 MiB and calls use bounded rate protection.
- Deputy reads time out after 10 seconds, retry at most once, and stop after 5,000 records.
- V1 is single-tenant by deployment; credentials are not multiplexed between customers.
- Logs and telemetry exclude request headers, bodies, tool arguments, results, and credentials.

## Operator responsibilities

- Generate unrelated Deputy and MCP bearer tokens and store them in a secret manager.
- Grant the Deputy token only the permissions required for the documented read resources.
- Rotate both tokens after personnel changes, suspected exposure, or handoff between operators.
- Terminate TLS at a maintained reverse proxy and keep `/mcp` off the public internet when remote
  access is unnecessary.
- Run `pnpm security:scan` and review dependency advisories before each production release.

Security fixes that would change the read-only boundary require explicit founder review.
