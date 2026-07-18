# Deputy Workforce Operations MCP

A read-only Model Context Protocol server that turns Deputy workforce data into five grounded,
operational workflows for AI assistants.

This is delivery 001 from **MCP Maker**: Hyperdrift's service for turning a SaaS API into a secure,
production-ready AI integration.

## What it will answer

- Where are the upcoming coverage gaps?
- Which scheduled workloads cross a configured overtime threshold?
- Which timesheets need operational attention?
- Where does scheduled work conflict with recorded availability?
- What is the staffing picture for a location and period?

Every result will identify its query period, source record identifiers, and the rule or threshold
used. The server will not create or change shifts, timesheets, leave, payroll, or employee data.

## Delivery shape

- Curated workflows instead of an endpoint catalogue
- Customer-owned Deputy credentials
- Local stdio and authenticated remote streamable-HTTP transports
- Single-tenant deployment boundary
- Synthetic fixture mode for evaluation without workforce data

## Status

Foundation and Deputy sandbox validation are in progress. The public API is not stable yet.

See [MISSION.md](MISSION.md) for product boundaries and [GROWTH.md](GROWTH.md) for the activation
and commercial handoff contract.

## Managed delivery

The open-source core is designed to remain useful on its own. MCP Maker offers managed deployment,
security hardening, custom workflows, and operational support for organisations that want a
production integration tailored to their environment.
