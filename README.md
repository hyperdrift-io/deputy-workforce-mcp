# Deputy Workforce Operations MCP

A read-only Model Context Protocol server that turns Deputy workforce records into five grounded,
operational workflows for AI assistants.

## What a Deputy manager can ask

- “Where are the coverage gaps from 20 to 26 July, using a minimum of two people?”
- “Which combined completed and rostered workloads cross our 40-hour planning threshold?”
- “Show timesheet exceptions above a 15-minute tolerance.”
- “Which rosters overlap recorded unavailability or approved leave?”
- “Summarise staffing by location and day for this week.”

The tools answer those questions directly instead of exposing Deputy's endpoint catalogue.

## Representative results

The examples below use fictional records and compact the structured response to the fields a
manager can act on.

### Coverage gaps

```json
{
  "period": { "start": "2026-07-20", "end": "2026-07-26", "timezone": "Europe/London" },
  "findings": [{ "kind": "coverage_gap", "sources": [{ "resource": "Roster", "id": 1001 }], "rule": "active roster has fewer than 2 people" }],
  "limits": []
}
```

### Overtime risk

```json
{ "period": { "start": "2026-07-20", "end": "2026-07-26", "timezone": "Europe/London" }, "findings": [{ "worker_id": 7, "planned_hours": 43.5, "threshold_hours": 40, "sources": [{ "resource": "Timesheet", "id": 2007 }, { "resource": "Roster", "id": 1007 }], "rule": "completed plus remaining rostered hours exceeds threshold" }], "limits": [] }
```

### Timesheet exceptions

```json
{ "period": { "start": "2026-07-20", "end": "2026-07-26", "timezone": "Europe/London" }, "findings": [{ "kind": "start_time_variance", "roster_id": 1002, "minutes": 22, "tolerance_minutes": 15, "sources": [{ "resource": "Roster", "id": 1002 }, { "resource": "Timesheet", "id": 2002 }], "rule": "timesheet start differs from roster beyond tolerance" }], "limits": [] }
```

### Availability conflicts

```json
{ "period": { "start": "2026-07-20", "end": "2026-07-26", "timezone": "Europe/London" }, "findings": [{ "kind": "recorded_unavailability_conflict", "sources": [{ "resource": "Roster", "id": 1002 }, { "resource": "EmployeeAvailability", "id": 4001 }], "rule": "roster interval overlaps recorded unavailability" }], "limits": [] }
```

### Staffing summary

```json
{ "period": { "start": "2026-07-20", "end": "2026-07-26", "timezone": "Europe/London" }, "findings": [{ "location": "North", "day": "2026-07-21", "rostered_hours": 16, "completed_hours": 12, "assigned": 3, "unassigned": 1, "sources": [{ "resource": "Roster", "id": 1008 }, { "resource": "Timesheet", "id": 2008 }], "rule": "group roster and timesheet hours by location and local day" }], "limits": [] }
```

Every finding names its period, source record identifiers, and the rule or threshold that produced
it. Empty data gives a confidence limit rather than a false all-clear.

## Safety and data handling

- Every tool is read-only, idempotent, and non-destructive.
- The server never creates or changes shifts, timesheets, leave, payroll, or employee data.
- Workload thresholds are operational planning signals, not payroll, employment, or legal advice.
- Telemetry excludes tool arguments, employee and location IDs, dates, result content, and tokens.
- Standard MCP analytics are disabled unless the deployment owner provides a PostHog project token;
  the privacy allowlist is documented in [PRIVACY.md](PRIVACY.md).
- V1 is single-tenant by deployment: one Deputy installation and one MCP bearer token per instance.
- Authentication, bounded HTTP transport, rate limiting, structured results, and stdio lifecycle
  use MCP Maker's shared `@hyperdrift-io/mcp-service-kit`; Deputy keeps its provider and workflow logic.

See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) for the complete contracts.

## Local installation

Node.js 22 and pnpm are required. The quickest safe inspection uses the public package and
fictional fixture data:

```bash
DEPUTY_MODE=fixture pnpm dlx @hyperdrift-io/deputy-workforce-mcp@latest
```

For a visible tool-list and tool-call proof, see [the fixture demonstration](docs/FIXTURE_DEMO.md).
The package is also distributed through the official MCP Registry and as a one-file MCP Bundle on
Smithery. Maintainers can reproduce the local bundle with:

```bash
pnpm mcpb:pack
```

To work from source:

```bash
git clone https://github.com/hyperdrift-io/deputy-workforce-mcp.git
cd deputy-workforce-mcp
pnpm install
pnpm build
DEPUTY_MODE=fixture node dist/stdio.js
```

Fixture mode contains fictional `Worker 01`-style records and is safe for evaluation. To connect a
Deputy installation, copy `.env.example` to `.env.local`, choose `DEPUTY_MODE=live`, and provide a
customer-owned base URL and OAuth access token. Live resource shapes still require the first
sandbox verification recorded in [docs/DEPUTY_API.md](docs/DEPUTY_API.md).

Example client configuration:

```json
{
  "mcpServers": {
    "deputy-workforce": {
      "command": "node",
      "args": ["/absolute/path/to/deputy-workforce-mcp/dist/stdio.js"],
      "env": { "DEPUTY_MODE": "fixture" }
    }
  }
}
```

## Remote deployment

The same five tools can run over authenticated streamable HTTP. Remote mode requires an MCP bearer
token of at least 32 bytes, authenticates before parsing requests, limits bodies to 1 MiB, and uses
bounded in-memory rate protection.

```bash
DEPUTY_MODE=fixture \
MCP_BEARER_TOKEN="replace-with-at-least-32-random-bytes" \
PORT=3013 \
pnpm start
```

- Health: `GET /health`
- MCP: authenticated `POST /mcp`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before operating a remote instance.

## Tool reference

The server registers exactly five tools:

- `find_coverage_gaps`
- `flag_overtime_risk`
- `list_timesheet_exceptions`
- `find_availability_conflicts`
- `summarise_staffing`

Inputs, rules, and output limits are documented in [docs/TOOLS.md](docs/TOOLS.md).

## Status

Fixture mode, stdio, and authenticated streamable HTTP are operational. Live Deputy mode remains
explicitly pending a customer-owned sandbox token and field-shape verification. The public API is
still in prototype discovery and may evolve from real workflow feedback.

## Built as MCP Maker delivery 001

Deputy Workforce Operations MCP is the flagship public implementation from
[MCP Maker](https://hyperdrift.io/services/mcp-maker): Hyperdrift turns established SaaS APIs into
secure, production-ready AI integrations.

The open-source core remains useful on its own. MCP Maker offers managed deployment, security
hardening, custom workflows, and operational support for organisations that want a production
integration tailored to their environment.
