import type { DeputyGateway } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { hoursBetween, report, workforceRecords, type WorkflowInput } from "./shared.js";

export interface OvertimeInput extends WorkflowInput {
  thresholdHours?: number;
}
export interface OvertimeFinding extends OperationalFinding {
  kind: "operational_overtime_threshold";
  completedHours: number;
  remainingRosteredHours: number;
  combinedHours: number;
  thresholdHours: number;
}

export interface OvertimeReport extends ToolResult<OvertimeFinding> {
  thresholdHours: number;
}

export async function flagOvertimeRisk(
  input: OvertimeInput,
  gateway: DeputyGateway,
): Promise<OvertimeReport> {
  const threshold = input.thresholdHours ?? 40;
  const { rosters, timesheets } = await workforceRecords(gateway, input);
  const completedTimesheets = timesheets.filter((sheet) => !sheet.discarded && !sheet.inProgress);
  const completedRosterIds = new Set(
    completedTimesheets.flatMap((sheet) => (sheet.rosterId === undefined ? [] : [sheet.rosterId])),
  );
  const employeeIds = new Set([
    ...rosters.flatMap((roster) => (roster.employeeId ? [roster.employeeId] : [])),
    ...timesheets.map((sheet) => sheet.employeeId),
  ]);
  const findings: OvertimeFinding[] = [];

  for (const employeeId of employeeIds) {
    const employeeSheets = completedTimesheets.filter((sheet) => sheet.employeeId === employeeId);
    const remainingRosters = rosters.filter(
      (roster) => roster.employeeId === employeeId && !completedRosterIds.has(roster.id),
    );
    const completedHours = employeeSheets.reduce((total, sheet) => total + sheet.totalHours, 0);
    const remainingRosteredHours = remainingRosters.reduce(
      (total, roster) => total + hoursBetween(roster.start, roster.end),
      0,
    );
    const combinedHours = completedHours + remainingRosteredHours;
    if (combinedHours <= threshold) continue;
    findings.push({
      kind: "operational_overtime_threshold",
      summary: `Worker ${employeeId} has ${combinedHours.toFixed(1)} combined completed and remaining rostered hours against the configured ${threshold}-hour threshold.`,
      sources: [
        ...employeeSheets.map((sheet) => ({ resource: "Timesheet" as const, id: sheet.id })),
        ...remainingRosters.map((roster) => ({ resource: "Roster" as const, id: roster.id })),
      ],
      rule: `completed_hours + remaining_rostered_hours > configured_threshold_hours (${threshold})`,
      employeeId,
      completedHours,
      remainingRosteredHours,
      combinedHours,
      thresholdHours: threshold,
    });
  }

  const summary = findings.length
    ? `${findings.length} worker ${findings.length === 1 ? "workload crosses" : "workloads cross"} the configured ${threshold}-hour operational threshold.`
    : rosters.length || timesheets.length
      ? `No combined workload crosses the configured ${threshold}-hour operational threshold.`
      : "No roster or timesheet records were available, so workload could not be evaluated.";
  return {
    ...report(input.range, findings, summary, [
      `The ${threshold}-hour threshold is an operational planning rule, not a payroll or legal determination.`,
      "Evaluate one ISO week at a time; this workflow uses exactly the supplied period and does not infer week boundaries.",
    ]),
    thresholdHours: threshold,
  };
}
