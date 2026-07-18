import type { DeputyGateway, RosterRecord, TimesheetRecord } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { hoursBetween, minutesBetween, report, workforceRecords, type WorkflowInput } from "./shared.js";

export interface TimesheetExceptionInput extends WorkflowInput {
  toleranceMinutes?: number;
}

export interface TimesheetExceptionFinding extends OperationalFinding {
  kind: "missing_timesheet" | "start_variance" | "end_variance" | "duration_variance" | "validation_flag";
  varianceMinutes?: number;
  toleranceMinutes: number;
}

function matchingTimesheet(roster: RosterRecord, timesheets: TimesheetRecord[]): TimesheetRecord | undefined {
  return timesheets.find((sheet) => sheet.rosterId === roster.id)
    ?? timesheets.find(
      (sheet) => sheet.employeeId === roster.employeeId && sheet.start.slice(0, 10) === roster.start.slice(0, 10),
    );
}

export async function listTimesheetExceptions(
  input: TimesheetExceptionInput,
  gateway: DeputyGateway,
): Promise<ToolResult<TimesheetExceptionFinding>> {
  const tolerance = input.toleranceMinutes ?? 15;
  const { rosters, timesheets } = await workforceRecords(gateway, input);
  const findings: TimesheetExceptionFinding[] = [];

  for (const roster of rosters.filter(
    (record): record is RosterRecord & { employeeId: number } => record.employeeId !== undefined,
  )) {
    const sheet = matchingTimesheet(roster, timesheets);
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
    : rosters.length
      ? `No timesheet exception crossed the configured ${tolerance}-minute tolerance.`
      : "No roster records were available, so timesheet matching could not be evaluated.";
  return report(input.range, findings, summary);
}
