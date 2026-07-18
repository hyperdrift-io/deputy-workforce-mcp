# Deputy Workforce Operations MCP

This repository is MCP Maker delivery `mcp-maker-001-deputy`. It inherits the Hyperdrift
workspace operating rules and exists to prove the MCP Maker proposition with a useful,
production-ready integration.

## Mission alignment

Before changing the product, read `MISSION.md`. Preserve the approved experience pillars and do
not implement a rejected direction without founder approval.

## Delivery rules

- Build a curated workforce-operations MCP, not a generic Deputy endpoint mirror.
- Keep every tool read-only. No Deputy mutation endpoint belongs in V1.
- Ground findings in source record identifiers, query periods, and explicit rules or thresholds.
- Do not score employees, infer protected characteristics, or present operational signals as
  payroll, employment, or legal advice.
- Do not emit names, emails, pay rates, free-text comments, or credentials in telemetry.
- Keep the deployment boundary single-tenant until paid demand justifies another model.
- Support local stdio and authenticated remote streamable HTTP from the same tool definitions.
- Use Node.js 22, strict TypeScript ESM, pnpm, and `.js` relative import suffixes.
- Runtime dependencies are limited to `@modelcontextprotocol/sdk` and `zod` unless the founder
  approves a change.
- During prototype discovery, verify with install, type-check, build, security scan, Deputy
  sandbox exercises, and manual MCP protocol checks. Do not add automated product test suites
  until the direction is declared stable.

## User-facing voice

Follow Hyperdrift's Speak to Enable covenant: strengths first, evidence second, next move third.
Missing data limits confidence in the result; it is not a user failure.

## Commercial role

The open-source core demonstrates MCP Maker's full delivery quality. Managed deployment,
security hardening, custom workflows, and operational support are the commercial handoff.

