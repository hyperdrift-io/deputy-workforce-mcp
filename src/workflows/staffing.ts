import type { DeputyGateway } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { hoursBetween, localDay, report, workforceRecords, type WorkflowInput } from "./shared.js";

export type StaffingInput = WorkflowInput;

export interface StaffingFinding extends OperationalFinding {
  kind: "daily_staffing_summary";
  day: string;
  rosterCount: number;
  rosteredHours: number;
  completedHours: number;
  assignedCount: number;
  unassignedCount: number;
}

export async function summariseStaffing(
  input: StaffingInput,
  gateway: DeputyGateway,
): Promise<ToolResult<StaffingFinding>> {
  const { rosters, timesheets } = await workforceRecords(gateway, input);
  const keys = new Set(rosters.map((roster) => `${roster.locationId}:${localDay(roster.start, input.range.timezone)}`));
  for (const sheet of timesheets) keys.add(`${sheet.locationId}:${localDay(sheet.start, input.range.timezone)}`);
  const findings: StaffingFinding[] = [...keys].sort().map((key) => {
    const [locationText, day] = key.split(":") as [string, string];
    const locationId = Number(locationText);
    const dayRosters = rosters.filter(
      (roster) => roster.locationId === locationId && localDay(roster.start, input.range.timezone) === day,
    );
    const dayTimesheets = timesheets.filter(
      (sheet) => sheet.locationId === locationId
        && localDay(sheet.start, input.range.timezone) === day
        && !sheet.discarded
        && !sheet.inProgress,
    );
    const rosteredHours = dayRosters.reduce((total, roster) => total + hoursBetween(roster.start, roster.end), 0);
    const completedHours = dayTimesheets.reduce((total, sheet) => total + sheet.totalHours, 0);
    const assignedCount = dayRosters.filter((roster) => roster.employeeId !== undefined).length;
    const unassignedCount = dayRosters.length - assignedCount;
    return {
      kind: "daily_staffing_summary",
      summary: `${day}: ${dayRosters.length} rosters (${assignedCount} assigned, ${unassignedCount} unassigned), ${rosteredHours.toFixed(1)} rostered hours, and ${completedHours.toFixed(1)} completed hours.`,
      sources: [
        ...dayRosters.map((roster) => ({ resource: "Roster" as const, id: roster.id })),
        ...dayTimesheets.map((sheet) => ({ resource: "Timesheet" as const, id: sheet.id })),
      ],
      rule: "group roster and completed, non-discarded timesheet records by local day and location",
      locationId,
      day,
      rosterCount: dayRosters.length,
      rosteredHours,
      completedHours,
      assignedCount,
      unassignedCount,
    };
  });

  const summary = findings.length
    ? `Staffing is summarised across ${findings.length} location-day ${findings.length === 1 ? "group" : "groups"}.`
    : "No roster or timesheet records were available, so staffing could not be summarised.";
  return report(input.range, findings, summary, [
    "Labour cost is omitted because no sandbox-verified aggregate cost field is available.",
  ]);
}
