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

function locationFilter<T extends { locationId: number }>(records: T[], locationIds?: number[]): T[] {
  return locationIds?.length ? records.filter((record) => locationIds.includes(record.locationId)) : records;
}

function employeeFilter<T extends { employeeId: number }>(records: T[], employeeIds?: number[]): T[] {
  return employeeIds?.length ? records.filter((record) => employeeIds.includes(record.employeeId)) : records;
}

class LiveDeputyGateway implements DeputyGateway {
  constructor(private readonly client: DeputyClient) {}

  async listRosters(range: DateRange, locationIds?: number[]): Promise<RosterRecord[]> {
    const rows = await this.client.queryResource("Roster", dateSearch("Date", range));
    return locationFilter(
      rows.map((row) => {
        const info = typeof row.OperationalUnitInfo === "object" && row.OperationalUnitInfo
          ? (row.OperationalUnitInfo as DeputyRecord)
          : undefined;
        const operationalUnitId = requiredNumber(row, "OperationalUnit", "Roster");
        const locationId = info ? numberValue(info, "Company") ?? operationalUnitId : operationalUnitId;
        const start = isoFromEpoch(row, "StartTime");
        const end = isoFromEpoch(row, "EndTime");
        if (!start || !end) throw new DeputyGatewayError("Roster timestamps do not match the documented epoch format.");
        const employeeId = numberValue(row, "Employee");
        return {
          id: requiredNumber(row, "Id", "Roster"),
          start,
          end,
          locationId,
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
    const rows = await this.client.queryResource("Timesheet", dateSearch("Date", range));
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
          locationId: operationalUnitId,
          operationalUnitId,
          ...(rosterId ? { rosterId } : {}),
          timeApproved: booleanValue(row, "TimeApproved"),
          validationFlag: numberValue(row, "ValidationFlag") ?? 0,
          inProgress: booleanValue(row, "isInProgress"),
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
    const rows = await this.client.queryResource("Leave", dateSearch("DateStart", range));
    return employeeFilter(
      rows.map((row) => ({
        id: requiredNumber(row, "Id", "Leave"),
        employeeId: requiredNumber(row, "Employee", "Leave"),
        locationId: requiredNumber(row, "Company", "Leave"),
        start: stringValue(row, "DateStart") ?? "",
        end: stringValue(row, "DateEnd") ?? "",
        status: requiredNumber(row, "Status", "Leave"),
      })),
      employeeIds,
    );
  }

  async listAvailability(_range: DateRange, _employeeIds?: number[]): Promise<AvailabilityRecord[]> {
    throw new DeputyGatewayError(
      "Availability reads need one sandbox field-shape check before live use. Fixture mode remains fully available.",
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
