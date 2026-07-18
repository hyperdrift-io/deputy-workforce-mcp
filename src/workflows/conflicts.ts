import type { DeputyGateway, RosterRecord } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { intervalsOverlap, overlapInterval, report, type WorkflowInput } from "./shared.js";

export type ConflictInput = WorkflowInput;

export interface ConflictFinding extends OperationalFinding {
  kind: "recorded_unavailability_conflict" | "approved_leave_conflict";
}

export async function findAvailabilityConflicts(
  input: ConflictInput,
  gateway: DeputyGateway,
): Promise<ToolResult<ConflictFinding>> {
  const rosters = await gateway.listRosters(input.range, input.locationIds);
  const employeeIds = [...new Set(rosters.flatMap((roster) => (roster.employeeId ? [roster.employeeId] : [])))];
  const [availability, leave] = await Promise.all([
    gateway.listAvailability(input.range, employeeIds),
    gateway.listLeave(input.range, employeeIds),
  ]);
  const findings: ConflictFinding[] = [];

  for (const roster of rosters.filter(
    (record): record is RosterRecord & { employeeId: number } => record.employeeId !== undefined,
  )) {
    for (const window of availability.filter(
      (record) => record.employeeId === roster.employeeId
        && record.unavailable
        && intervalsOverlap(roster.start, roster.end, record.start, record.end),
    )) {
      const overlap = overlapInterval(roster.start, roster.end, window.start, window.end);
      findings.push({
        kind: "recorded_unavailability_conflict",
        summary: "This roster overlaps a recorded unavailability window.",
        sources: [
          { resource: "Roster", id: roster.id },
          { resource: "EmployeeAvailability", id: window.id },
        ],
        rule: "roster interval overlaps recorded unavailability",
        start: overlap.start,
        end: overlap.end,
        employeeId: roster.employeeId,
        locationId: roster.locationId,
      });
    }
    for (const leaveRecord of leave.filter(
      (record) => record.employeeId === roster.employeeId
        && [1, 4, 5].includes(record.status)
        && intervalsOverlap(roster.start, roster.end, record.start, record.end),
    )) {
      const overlap = overlapInterval(roster.start, roster.end, leaveRecord.start, leaveRecord.end);
      findings.push({
        kind: "approved_leave_conflict",
        summary: "This roster overlaps a Deputy leave record with an approved status.",
        sources: [
          { resource: "Roster", id: roster.id },
          { resource: "Leave", id: leaveRecord.id },
        ],
        rule: "roster interval overlaps leave with status 1, 4, or 5",
        start: overlap.start,
        end: overlap.end,
        employeeId: roster.employeeId,
        locationId: roster.locationId,
      });
    }
  }

  const summary = findings.length
    ? `${findings.length} availability ${findings.length === 1 ? "conflict needs" : "conflicts need"} operational review.`
    : rosters.length
      ? "No roster interval overlaps recorded unavailability or approved leave in this period."
      : "No roster records were available, so availability conflicts could not be evaluated.";
  return report(input.range, findings, summary);
}
