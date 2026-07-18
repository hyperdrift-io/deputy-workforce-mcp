import type { DeputyGateway, RosterRecord, TimesheetRecord } from "../deputy/contracts.js";
import type { DateRange, OperationalFinding, ToolResult } from "../types.js";
import { uniqueSources } from "../types.js";

export interface WorkflowInput {
  range: DateRange;
  locationIds?: number[];
}
export function hoursBetween(start: string, end: string): number {
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / 3_600_000);
}

export function minutesBetween(first: string, second: string): number {
  return Math.abs(Date.parse(first) - Date.parse(second)) / 60_000;
}

export function intervalsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return Date.parse(firstStart) < Date.parse(secondEnd) && Date.parse(firstEnd) > Date.parse(secondStart);
}

export function overlapInterval(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): { start: string; end: string } {
  return {
    start: new Date(Math.max(Date.parse(firstStart), Date.parse(secondStart))).toISOString(),
    end: new Date(Math.min(Date.parse(firstEnd), Date.parse(secondEnd))).toISOString(),
  };
}

export function localDay(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

export function report<TFinding extends OperationalFinding>(
  range: DateRange,
  findings: TFinding[],
  summary: string,
  limits: string[] = [],
): ToolResult<TFinding> {
  return {
    period: range,
    findings,
    sources: uniqueSources(findings),
    limits,
    summary,
  };
}

export async function workforceRecords(
  gateway: DeputyGateway,
  input: WorkflowInput,
): Promise<{ rosters: RosterRecord[]; timesheets: TimesheetRecord[] }> {
  const [rosters, timesheets] = await Promise.all([
    gateway.listRosters(input.range, input.locationIds),
    gateway.listTimesheets(input.range, input.locationIds),
  ]);
  return { rosters, timesheets };
}
