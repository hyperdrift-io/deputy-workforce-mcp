# Privacy contract

## Data read from Deputy

The five workflows read the minimum fields needed from roster, timesheet, employee, leave,
employee-availability, operational-unit, and company resources. Results may include stable record
IDs, a workforce display label, locations, intervals, rostered hours, completed hours, approval
states, and validation flags when requested by an authorised user.

## Data deliberately excluded

The gateway excludes email, phone, postal address, date of birth, gender, pronouns, pay rate,
appraisal, payroll identifiers, photos, free-text comments, and confidential employment fields.
Labour cost is omitted until a customer explicitly approves a sandbox-verified aggregate field.

## Telemetry

Local stderr telemetry records only:

- delivery ID;
- tool name and fixture/live mode;
- MCP client name and version;
- duration, success/error outcome, and result count.
- service lifecycle events with local bind host/port or shutdown signal.

When a deployment owner explicitly provides `POSTHOG_PROJECT_TOKEN`, the server additionally emits
PostHog's standard `$mcp_initialize`, `$mcp_tools_list`, and `$mcp_tool_call` events. A strict
allowlist retains only the anonymous session, tool name or listed tool names, client and protocol
versions, duration, error state/type, server identity, delivery ID, fixture/live mode, and
transport. Exception autocapture and identity capture are disabled.

Neither telemetry path includes tool arguments, employee or location IDs, query dates, result
content, Deputy response bodies, free text, exception messages, or credentials.

## Retention and deletion

The deployment owner controls application logs and their retention. The open-source server does not
create a database. PostHog telemetry is disabled unless the deployment owner supplies a project
token; that owner also controls the destination and retention. Delete local logs through the
deployment's normal log-retention controls and rotate credentials before transferring ownership.

Deputy remains the source of truth; this server does not copy or mutate workforce records.
