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

Telemetry records only:

- delivery ID;
- tool name and fixture/live mode;
- MCP client name and version;
- duration, success/error outcome, and result count.
- service lifecycle events with local bind host/port or shutdown signal.

Telemetry never includes tool arguments, employee or location IDs, query dates, result content,
Deputy response bodies, or credentials.

## Retention and deletion

The deployment owner controls application logs and their retention. The open-source server does not
create a database or send telemetry to Hyperdrift by itself. Delete local logs through the
deployment's normal log-retention controls and rotate credentials before transferring ownership.

Deputy remains the source of truth; this server does not copy or mutate workforce records.
