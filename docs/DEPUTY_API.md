# Deputy read API contract

This document freezes the smallest documented Deputy surface used by MCP Maker delivery 001. It
records documentation evidence separately from live installation evidence so the implementation
does not claim workflow coverage that has not been exercised.

## Verification status

- Official documentation reviewed: 2026-07-20
- Live Deputy development installation exercised: **2026-07-20**
- Authentication: `Bearer` returned HTTP 200 and is the scheme used by the client; legacy `OAuth`
  also returned HTTP 200 but is not used
- API host: customer-specific `https://{install}.{geo}.deputy.com`
- Identity check: `GET /api/v1/me` returned HTTP 200

All V1 resource `INFO` and bounded `QUERY` requests returned HTTP 200. This verifies authentication,
resource availability, and the schemas needed by the adapter. It does not yet verify every outcome:
the development installation contains no roster, leave, or availability records, so those workflow
paths still need representative data before they can be described as live-proven. Fixture mode does
not require Deputy access.

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

The documented query body supports `search`, `sort`, `start`, `max`, and `join`. Deputy accepts at
most `500` records per response. The client advances `start` in pages of 500 and stops after ten
pages; reaching that boundary is reported as a partial read rather than a complete result. Contract
probes used `max: 5`.

## V1 resources

| Resource | Purpose | Minimal fields retained | Development-install evidence |
| --- | --- | --- | --- |
| `Roster` | Coverage, workload, conflicts, staffing | `Id`, `Date`, `StartTime`, `EndTime`, `OperationalUnit`, `Employee`, `Published`, `Open` | `INFO` 200; `QUERY` 200; 0 sample rows |
| `Timesheet` | Completed hours and exceptions | `Id`, `Employee`, `Date`, `StartTime`, `EndTime`, `TotalTime`, `Roster`, `TimeApproved`, `ValidationFlag`, `OperationalUnit`, `IsInProgress`, `Discarded` | `INFO` 200; `QUERY` 200; 1 sample row |
| `Employee` | Stable worker label and active state | `Id`, `Company`, `DisplayName`, `Active` | `INFO` 200; `QUERY` 200; 1 sample row |
| `Leave` | Approved leave conflicts | `Id`, `Employee`, `Company`, `DateStart`, `DateEnd`, `Status`, `TotalHours` | `INFO` 200; `QUERY` 200; 0 sample rows |
| `EmployeeAvailability` | Recorded availability conflicts | `Id`, `Employee`, `Date`, `StartTime`, `EndTime`, `Type`, `Schedule` | `INFO` 200; `QUERY` 200; 0 sample rows |
| `OperationalUnit` | Area-to-location mapping | `Id`, `Company`, `OperationalUnitName`, `Active` | `INFO` 200; `QUERY` 200; 5 sample rows |
| `Company` | Location labels | `Id`, `CompanyName`, `Active` | `INFO` 200; `QUERY` 200; 2 sample rows |

## Observed shapes and relationships

- `Timesheet.Id`, `Employee`, `StartTime`, `EndTime`, and `OperationalUnit` were numbers;
  `StartTime` and `EndTime` were ten-digit Unix epoch seconds. `Date` was an ISO date-time string
  with a UTC offset and `IsInProgress` was boolean.
- Joining `OperationalUnit` to `Timesheet` returned `OperationalUnitInfo` containing `Id`,
  `Company`, `CompanyName`, and `OperationalUnitName`. `OperationalUnitInfo.Company` is the
  location identifier used to associate a timesheet with `Company`.
- `OperationalUnit.Company` was numeric and is the location identifier. This relationship was
  present in each of the five sampled operational units.
- `EmployeeAvailability.INFO` declared `Id`, `Employee`, `Date`, `StartTime`, `EndTime`, `Type`,
  and `Schedule`. `StartTime` and `EndTime` use Unix epoch seconds. No availability row was present,
  so value nullability and type variants remain unobserved.
- Empty result sets leave record-level timestamp formats and nullability unobserved for `Roster`
  and `Leave`. The adapter must preserve that distinction rather than inferring live coverage from
  schema availability.

Nullability is recorded only when observable from bounded results. The populated sample did not
establish a general nullability guarantee, so the adapter continues to validate required values at
the boundary and treats optional values explicitly.

The gateway discards names other than a workforce display label, plus all email, phone, address,
date-of-birth, gender, pronoun, pay-rate, appraisal, payroll, photo, and free-text comment fields.

## Live verification procedure

1. Store a customer-owned token and installation URL in `.env.local`; never commit either value.
2. call `GET /api/v1/me` and record only the response status and verified auth scheme;
3. call `GET /api/v1/resource/{Resource}/INFO` where supported;
4. run a `max: 5` bounded query for each V1 resource;
5. record field names, observable nullability, timestamp units, paging behaviour, and response
   status here;
6. remove all personal values from notes and command output before sharing them.

No Deputy mutation endpoint is permitted in this delivery.
