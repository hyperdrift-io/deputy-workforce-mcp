export interface DateRange {
  start: string;
  end: string;
  timezone: string;
}

export interface SourceReference {
  resource: "Roster" | "Timesheet" | "Employee" | "Leave" | "EmployeeAvailability" | "OperationalUnit" | "Company";
  id: number;
}

export interface OperationalFinding {
  kind: string;
  summary: string;
  sources: SourceReference[];
  rule: string;
  start?: string;
  end?: string;
  locationId?: number;
  employeeId?: number;
}

export interface ToolResult<TFinding extends OperationalFinding = OperationalFinding> {
  period: DateRange;
  findings: TFinding[];
  sources: SourceReference[];
  limits: string[];
  summary: string;
}

export function uniqueSources(findings: OperationalFinding[]): SourceReference[] {
  const seen = new Set<string>();
  return findings.flatMap((finding) =>
    finding.sources.filter((source) => {
      const key = `${source.resource}:${source.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}
