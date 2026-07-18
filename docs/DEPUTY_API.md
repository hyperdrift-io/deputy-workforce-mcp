# Deputy read API contract

This document freezes the smallest documented Deputy surface used by MCP Maker delivery 001. It
records documentation evidence separately from live sandbox evidence so the implementation never
claims verification it has not completed.

## Verification status

- Official documentation reviewed: 2026-07-18
- Live Deputy installation exercised: **pending sandbox credentials**
- Default authentication scheme: `Bearer`, as specified by Deputy's current OAuth guide
- API host: customer-specific `https://{install}.{geo}.deputy.com`
- Identity check: `GET /api/v1/me`

Live mode must remain visibly unverified until all rows in the resource table have a successful
sandbox status and returned field shape recorded here. Fixture mode does not require Deputy access.

## Sources

- [Public API overview](https://developer.deputy.com/docs/public-api-facts-and-overview)
- [Authentication overview](https://developer.deputy.com/docs/authenticating-with-deputy)
- [OAuth 2.0 guide](https://developer.deputy.com/docs/using-oauth-20)
- [Deputy API index for AI agents](https://developer.deputy.com/llms.txt)
- [Retrieving shifts](https://developer.deputy.com/docs/getting-shifts)

## Query contract

All V1 resource reads use:

```text
POST /api/v1/resource/{Resource}/QUERY
Authorization: Bearer {access token}
Accept: application/json
Content-Type: application/json
```

The documented query body supports `search`, `sort`, `start`, `max`, and `join`. Requests are
bounded to `max: 500`; the client advances `start` and stops after ten pages. Date filters and
timestamp units must be confirmed against a real sandbox before live mode is declared ready.

## V1 resources

| Resource | Purpose | Minimal documented fields retained | Sandbox status |
| --- | --- | --- | --- |
| `Roster` | Coverage, workload, conflicts, staffing | `Id`, `Date`, `StartTime`, `EndTime`, `OperationalUnit`, `Employee`, `Published`, `Open` | Pending |
| `Timesheet` | Completed hours and exceptions | `Id`, `Employee`, `Date`, `StartTime`, `EndTime`, `TotalTime`, `Roster`, `TimeApproved`, `ValidationFlag`, `OperationalUnit`, `isInProgress`, `Discarded` | Pending |
| `Employee` | Stable worker label and active state | `Id`, `Company`, `DisplayName`, `Active` | Pending |
| `Leave` | Approved leave conflicts | `Id`, `Employee`, `Company`, `DateStart`, `DateEnd`, `Status`, `TotalHours` | Pending |
| `EmployeeAvailability` | Recorded availability conflicts | Field names pending `/INFO` and sandbox confirmation | Pending |
| `OperationalUnit` | Area-to-location mapping | `Id`, `Company`, `OperationalUnitName`, `Active` | Pending |
| `Company` | Location labels | `Id`, `CompanyName`, `Active` | Pending |

The gateway discards names other than a workforce display label, plus all email, phone, address,
date-of-birth, gender, pronoun, pay-rate, appraisal, payroll, photo, and free-text comment fields.

## Live verification procedure

1. Store a customer-owned token and installation URL in `.env.local`.
2. call `GET /api/v1/me` and record only the response status and verified auth scheme;
3. call `GET /api/v1/resource/{Resource}/INFO` where supported;
4. run a `max: 5` bounded query for each V1 resource;
5. record field names, nullability, timestamp units, paging behaviour, and response status here;
6. remove all personal values from notes and command output before sharing them.

No Deputy mutation endpoint is permitted in this delivery.
