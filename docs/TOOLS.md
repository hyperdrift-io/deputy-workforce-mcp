# Tool reference

All tools accept `start_date`, `end_date`, and an IANA `timezone`. Dates use `YYYY-MM-DD`, the end
date is inclusive, and a request is limited to 31 days. `location_ids` is optional.

Every tool returns readable text plus structured `period`, `findings`, `sources`, and `limits`.

## `find_coverage_gaps`

Finds open or unassigned rosters. When `minimum_people` is supplied, it also evaluates each active
roster interval against that caller-owned requirement. Without it, the tool states that only
unassigned shifts were evaluated.

## `flag_overtime_risk`

Combines completed timesheet hours with remaining rostered hours, avoiding double counting a
roster that already has a timesheet. `threshold_hours` defaults to 40 and is always repeated in the
result as an operational planning rule, not a statutory or payroll conclusion.

## `list_timesheet_exceptions`

Matches assigned rosters with timesheets and reports missing records, start/end variance, duration
variance, and Deputy validation flags. `tolerance_minutes` defaults to 15.

The result describes record differences; it does not label or judge a worker.

## `find_availability_conflicts`

Finds roster intervals overlapping recorded unavailability or leave with an approved Deputy status.
Each finding cites both source records and the exact overlap interval.

Live EmployeeAvailability mapping is intentionally disabled until the first sandbox confirms its
field shape. Fixture mode demonstrates the complete workflow.

## `summarise_staffing`

Groups roster count, rostered hours, completed hours, and assigned/unassigned counts by location and
local day. It omits labour cost rather than estimating pay from unverified data.
