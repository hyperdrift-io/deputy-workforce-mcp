import type { DeputyGateway, RosterRecord, TimesheetRecord } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { hoursBetween, localDay, minutesBetween, report, workforceRecords, type WorkflowInput } from "./shared.js";

export interface TimesheetExceptionInput extends WorkflowInput {
  toleranceMinutes?: number;
}

export interface TimesheetExceptionFinding extends OperationalFinding {
  kind: "missing_timesheet" | "start_variance" | "end_variance" | "duration_variance" | "validation_flag";
  varianceMinutes?: number;
  toleranceMinutes: number;
}

export interface TimesheetExceptionReport extends ToolResult<TimesheetExceptionFinding> {
  toleranceMinutes: number;
}

function matchTimesheets(
  rosters: Array<RosterRecord & { employeeId: number }>,
  timesheets: TimesheetRecord[],
  timezone: string,
): Map<number, TimesheetRecord> {
  const matches = new Map<number, TimesheetRecord>();
  const usedTimesheetIds = new Set<number>();

  // Preserve explicit Deputy links before considering any inferred same-day match.
  for (const roster of rosters) {
    const exact = timesheets.find(
      (sheet) => !usedTimesheetIds.has(sheet.id) && sheet.rosterId === roster.id,
    );
    if (!exact) continue;
    matches.set(roster.id, exact);
    usedTimesheetIds.add(exact.id);
  }

  for (const roster of rosters) {
    if (matches.has(roster.id)) continue;
    const fallback = timesheets
      .filter((sheet) => !usedTimesheetIds.has(sheet.id)
        && sheet.rosterId === undefined
        && sheet.employeeId === roster.employeeId
        && localDay(sheet.start, timezone) === localDay(roster.start, timezone))
      .sort((first, second) => {
        const distance = minutesBetween(roster.start, first.start) - minutesBetween(roster.start, second.start);
        return distance || first.id - second.id;
      })[0];
    if (!fallback) continue;
    matches.set(roster.id, fallback);
    usedTimesheetIds.add(fallback.id);
  }

  return matches;
}

export async function listTimesheetExceptions(
  input: TimesheetExceptionInput,
  gateway: DeputyGateway,
): Promise<TimesheetExceptionReport> {
  const tolerance = input.toleranceMinutes ?? 15;
  const { rosters, timesheets } = await workforceRecords(gateway, input);
  const usableTimesheets = timesheets.filter((sheet) => !sheet.discarded);
  const findings: TimesheetExceptionFinding[] = [];
  const assignedRosters = rosters.filter(
    (record): record is RosterRecord & { employeeId: number } => record.employeeId !== undefined,
  );
  const matchedTimesheets = matchTimesheets(assignedRosters, usableTimesheets, input.range.timezone);

  for (const roster of assignedRosters) {
    const sheet = matchedTimesheets.get(roster.id);
    if (!sheet) {
      findings.push({
        kind: "missing_timesheet",
        summary: "This assigned roster has no matching timesheet in the queried period.",
        sources: [{ resource: "Roster", id: roster.id }],
        rule: "assigned roster has no matching timesheet",
        start: roster.start,
        end: roster.end,
        employeeId: roster.employeeId,
        locationId: roster.locationId,
        toleranceMinutes: tolerance,
      });
      continue;
    }
    const sourcePair = [
      { resource: "Roster" as const, id: roster.id },
      { resource: "Timesheet" as const, id: sheet.id },
    ];
    const comparisons = [
      { kind: "start_variance" as const, variance: minutesBetween(roster.start, sheet.start) },
      { kind: "end_variance" as const, variance: minutesBetween(roster.end, sheet.end) },
      {
        kind: "duration_variance" as const,
        variance: Math.abs(hoursBetween(roster.start, roster.end) - sheet.totalHours) * 60,
      },
    ];
    for (const comparison of comparisons.filter((item) => item.variance > tolerance)) {
      findings.push({
        kind: comparison.kind,
        summary: `The ${comparison.kind.replace("_", " ")} is ${comparison.variance.toFixed(0)} minutes, above the configured ${tolerance}-minute tolerance.`,
        sources: sourcePair,
        rule: `${comparison.kind}_minutes > tolerance_minutes (${tolerance})`,
        start: sheet.start,
        end: sheet.end,
        employeeId: roster.employeeId,
        locationId: roster.locationId,
        varianceMinutes: comparison.variance,
        toleranceMinutes: tolerance,
      });
    }
    if (sheet.validationFlag !== 0) {
      findings.push({
        kind: "validation_flag",
        summary: "Deputy attached a validation flag to this timesheet for operational review.",
        sources: sourcePair,
        rule: "timesheet.validation_flag != 0",
        start: sheet.start,
        end: sheet.end,
        employeeId: roster.employeeId,
        locationId: roster.locationId,
        toleranceMinutes: tolerance,
      });
    }
  }

  const summary = findings.length
    ? `${findings.length} timesheet ${findings.length === 1 ? "exception needs" : "exceptions need"} operational review using a ${tolerance}-minute tolerance.`
    : assignedRosters.length
      ? `No timesheet exception crossed the configured ${tolerance}-minute tolerance.`
      : rosters.length
        ? "No assigned roster records were available, so timesheet matching could not be evaluated."
        : "No roster records were available, so timesheet matching could not be evaluated.";
  return {
    ...report(input.range, findings, summary),
    toleranceMinutes: tolerance,
  };
}
