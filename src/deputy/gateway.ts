import type { Config } from "../config.js";
import type { DateRange } from "../types.js";
import { DeputyClient, DeputyGatewayError, type DeputyRecord } from "./client.js";
import type {
  AvailabilityRecord,
  DeputyGateway,
  EmployeeRecord,
  LeaveRecord,
  LocationRecord,
  RosterRecord,
  TimesheetRecord,
} from "./contracts.js";
import { FixtureDeputyGateway } from "./fixture-gateway.js";

function numberValue(record: DeputyRecord, field: string): number | undefined {
  const value = record[field];
  const converted = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(converted) ? converted : undefined;
}

function booleanValue(record: DeputyRecord, field: string): boolean {
  const value = record[field];
  return value === true || value === 1 || value === "1";
}

function stringValue(record: DeputyRecord, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isoFromEpoch(record: DeputyRecord, field: string): string | undefined {
  const value = numberValue(record, field);
  return value === undefined ? undefined : new Date(value * 1_000).toISOString();
}

function isoFromString(record: DeputyRecord, field: string): string | undefined {
  const value = stringValue(record, field);
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function requiredNumber(record: DeputyRecord, field: string, resource: string): number {
  const value = numberValue(record, field);
  if (value === undefined) throw new DeputyGatewayError(`${resource} data is missing the documented ${field} field.`);
  return value;
}

function dateSearch(field: string, range: DateRange): Record<string, unknown> {
  return {
    search: {
      s1: { field, data: range.start.slice(0, 10), type: "ge" },
      s2: { field, data: range.end.slice(0, 10), type: "lt" },
    },
  };
}

function overlapDateSearch(startField: string, endField: string, range: DateRange): Record<string, unknown> {
  return {
    search: {
      s1: { field: startField, data: range.end.slice(0, 10), type: "lt" },
      s2: { field: endField, data: range.start.slice(0, 10), type: "ge" },
    },
  };
}

function joinedLocationId(record: DeputyRecord, resource: "Roster" | "Timesheet"): number {
  const info = record.OperationalUnitInfo;
  if (typeof info !== "object" || info === null || Array.isArray(info)) {
    throw new DeputyGatewayError(
      `${resource} data could not be linked to a location because Deputy did not return `
        + "OperationalUnitInfo. Confirm the OperationalUnitObject join is available, then retry.",
    );
  }
  const locationId = numberValue(info as DeputyRecord, "Company");
  if (locationId === undefined) {
    throw new DeputyGatewayError(
      `${resource} data could not be linked to a location because OperationalUnitInfo.Company is missing. `
        + "Confirm the operational unit has a Company assignment, then retry.",
    );
  }
  return locationId;
}

function overlaps(start: string, end: string, range: DateRange): boolean {
  return Date.parse(start) < Date.parse(range.end) && Date.parse(end) >= Date.parse(range.start);
}

function locationFilter<T extends { locationId: number }>(records: T[], locationIds?: number[]): T[] {
  return locationIds?.length ? records.filter((record) => locationIds.includes(record.locationId)) : records;
}

function employeeFilter<T extends { employeeId: number }>(records: T[], employeeIds?: number[]): T[] {
  return employeeIds?.length ? records.filter((record) => employeeIds.includes(record.employeeId)) : records;
}

class LiveDeputyGateway implements DeputyGateway {
  constructor(private readonly client: DeputyClient) {}

  async listRosters(range: DateRange, locationIds?: number[]): Promise<RosterRecord[]> {
    const rows = await this.client.queryResource("Roster", {
      ...dateSearch("Date", range),
      join: ["OperationalUnitObject"],
    });
    return locationFilter(
      rows.map((row) => {
        const operationalUnitId = requiredNumber(row, "OperationalUnit", "Roster");
        const start = isoFromEpoch(row, "StartTime");
        const end = isoFromEpoch(row, "EndTime");
        if (!start || !end) throw new DeputyGatewayError("Roster timestamps do not match the documented epoch format.");
        const employeeId = numberValue(row, "Employee");
        return {
          id: requiredNumber(row, "Id", "Roster"),
          start,
          end,
          locationId: joinedLocationId(row, "Roster"),
          operationalUnitId,
          ...(employeeId ? { employeeId } : {}),
          published: booleanValue(row, "Published"),
          open: booleanValue(row, "Open") || !employeeId,
        };
      }),
      locationIds,
    );
  }

  async listTimesheets(range: DateRange, locationIds?: number[]): Promise<TimesheetRecord[]> {
    const rows = await this.client.queryResource("Timesheet", {
      ...dateSearch("Date", range),
      join: ["OperationalUnitObject"],
    });
    return locationFilter(
      rows.map((row) => {
        const start = isoFromEpoch(row, "StartTime");
        const end = isoFromEpoch(row, "EndTime");
        if (!start || !end) throw new DeputyGatewayError("Timesheet timestamps do not match the documented epoch format.");
        const operationalUnitId = requiredNumber(row, "OperationalUnit", "Timesheet");
        const rosterId = numberValue(row, "Roster");
        return {
          id: requiredNumber(row, "Id", "Timesheet"),
          start,
          end,
          totalHours: numberValue(row, "TotalTime") ?? (Date.parse(end) - Date.parse(start)) / 3_600_000,
          employeeId: requiredNumber(row, "Employee", "Timesheet"),
          locationId: joinedLocationId(row, "Timesheet"),
          operationalUnitId,
          ...(rosterId ? { rosterId } : {}),
          timeApproved: booleanValue(row, "TimeApproved"),
          validationFlag: numberValue(row, "ValidationFlag") ?? 0,
          inProgress: booleanValue(row, "IsInProgress"),
          discarded: booleanValue(row, "Discarded"),
        };
      }),
      locationIds,
    );
  }

  async listEmployees(locationIds?: number[]): Promise<EmployeeRecord[]> {
    const rows = await this.client.queryResource("Employee");
    return locationFilter(
      rows.map((row) => {
        const id = requiredNumber(row, "Id", "Employee");
        return {
          id,
          label: stringValue(row, "DisplayName") ?? `Worker ${id}`,
          locationId: requiredNumber(row, "Company", "Employee"),
          active: booleanValue(row, "Active"),
        };
      }),
      locationIds,
    );
  }

  async listLeave(range: DateRange, employeeIds?: number[]): Promise<LeaveRecord[]> {
    const rows = await this.client.queryResource("Leave", overlapDateSearch("DateStart", "DateEnd", range));
    return employeeFilter(
      rows.map((row) => {
        const start = isoFromEpoch(row, "Start") ?? isoFromString(row, "DateStart");
        const end = isoFromEpoch(row, "End") ?? isoFromString(row, "DateEnd");
        if (!start || !end) {
          throw new DeputyGatewayError(
            "Leave data is missing a usable Start/End or DateStart/DateEnd interval. Confirm the Deputy record, then retry.",
          );
        }
        return {
          id: requiredNumber(row, "Id", "Leave"),
          employeeId: requiredNumber(row, "Employee", "Leave"),
          locationId: requiredNumber(row, "Company", "Leave"),
          start,
          end,
          status: requiredNumber(row, "Status", "Leave"),
        };
      }).filter((record) => overlaps(record.start, record.end, range)),
      employeeIds,
    );
  }

  async listAvailability(range: DateRange, employeeIds?: number[]): Promise<AvailabilityRecord[]> {
    const rows = await this.client.queryResource("EmployeeAvailability", dateSearch("Date", range));
    return employeeFilter(
      rows.map((row) => {
        const start = isoFromEpoch(row, "StartTime");
        const end = isoFromEpoch(row, "EndTime");
        if (!start || !end) {
          throw new DeputyGatewayError(
            "EmployeeAvailability timestamps do not match the documented epoch format. Confirm the Deputy record, then retry.",
          );
        }
        return {
          id: requiredNumber(row, "Id", "EmployeeAvailability"),
          employeeId: requiredNumber(row, "Employee", "EmployeeAvailability"),
          start,
          end,
          unavailable: true,
        };
      }).filter((record) => overlaps(record.start, record.end, range)),
      employeeIds,
    );
  }

  async listLocations(): Promise<LocationRecord[]> {
    const rows = await this.client.queryResource("Company");
    return rows.map((row) => ({
      id: requiredNumber(row, "Id", "Company"),
      label: stringValue(row, "CompanyName") ?? `Location ${requiredNumber(row, "Id", "Company")}`,
      timezone: "UTC",
      active: row.Active === undefined ? true : booleanValue(row, "Active"),
    }));
  }
}

export function createDeputyGateway(config: Config): DeputyGateway {
  return config.deputyMode === "fixture"
    ? new FixtureDeputyGateway()
    : new LiveDeputyGateway(new DeputyClient(config));
}
