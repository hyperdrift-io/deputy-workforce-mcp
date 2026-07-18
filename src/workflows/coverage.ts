import type { DeputyGateway, RosterRecord } from "../deputy/contracts.js";
import type { OperationalFinding, ToolResult } from "../types.js";
import { report, type WorkflowInput } from "./shared.js";

export interface CoverageInput extends WorkflowInput {
  minimumPeople?: number;
}
export interface CoverageFinding extends OperationalFinding {
  kind: "unassigned_shift" | "minimum_staffing_shortfall";
  assignedPeople?: number;
  minimumPeople?: number;
}

function shortfalls(rosters: RosterRecord[], minimumPeople: number): CoverageFinding[] {
  const findings: CoverageFinding[] = [];
  const locationIds = [...new Set(rosters.map((roster) => roster.locationId))];

  for (const locationId of locationIds) {
    const locationRosters = rosters.filter((roster) => roster.locationId === locationId);
    const boundaries = [...new Set(locationRosters.flatMap((roster) => [roster.start, roster.end]))]
      .sort((first, second) => Date.parse(first) - Date.parse(second));

    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const start = boundaries[index]!;
      const end = boundaries[index + 1]!;
      const active = locationRosters.filter(
        (roster) => Date.parse(roster.start) < Date.parse(end) && Date.parse(roster.end) > Date.parse(start),
      );
      if (!active.length) continue;
      const assigned = active.filter((roster) => roster.employeeId !== undefined).length;
      if (assigned >= minimumPeople) continue;
      findings.push({
        kind: "minimum_staffing_shortfall",
        summary: `${assigned} assigned ${assigned === 1 ? "person" : "people"} for a minimum of ${minimumPeople}.`,
        sources: active.map((roster) => ({ resource: "Roster" as const, id: roster.id })),
        rule: `assigned_people < minimum_people (${minimumPeople})`,
        start,
        end,
        locationId,
        assignedPeople: assigned,
        minimumPeople,
      });
    }
  }
  return findings;
}

export async function findCoverageGaps(
  input: CoverageInput,
  gateway: DeputyGateway,
): Promise<ToolResult<CoverageFinding>> {
  const rosters = await gateway.listRosters(input.range, input.locationIds);
  const unassigned: CoverageFinding[] = rosters
    .filter((roster) => roster.open || roster.employeeId === undefined)
    .map((roster) => ({
      kind: "unassigned_shift",
      summary: "This roster interval is open and has no assigned worker.",
      sources: [{ resource: "Roster", id: roster.id }],
      rule: "roster.open = true or roster.employee_id is absent",
      start: roster.start,
      end: roster.end,
      locationId: roster.locationId,
    }));
  const thresholdFindings = input.minimumPeople ? shortfalls(rosters, input.minimumPeople) : [];
  const findings = [...unassigned, ...thresholdFindings];
  const limits = input.minimumPeople
    ? []
    : ["No minimum staffing requirement was supplied, so only unassigned shifts were evaluated."];
  const summary = findings.length
    ? `${findings.length} coverage ${findings.length === 1 ? "gap needs" : "gaps need"} operational review.`
    : rosters.length
      ? "No coverage gap matched the supplied rules for this period."
      : "No roster records were available for this period, so coverage could not be evaluated.";
  return report(input.range, findings, summary, limits);
}
