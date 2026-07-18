import type { DateRange } from "../types.js";
import { availability, employees, leave, locations, rosters, timesheets } from "../fixtures/workforce.js";
import type {
  AvailabilityRecord,
  DeputyGateway,
  EmployeeRecord,
  LeaveRecord,
  LocationRecord,
  RosterRecord,
  TimesheetRecord,
} from "./contracts.js";

function overlaps(start: string, end: string, range: DateRange): boolean {
  return Date.parse(start) < Date.parse(range.end) && Date.parse(end) > Date.parse(range.start);
}
function selected(id: number, ids?: number[]): boolean {
  return !ids?.length || ids.includes(id);
}

export class FixtureDeputyGateway implements DeputyGateway {
  async listRosters(range: DateRange, locationIds?: number[]): Promise<RosterRecord[]> {
    return rosters.filter((record) => overlaps(record.start, record.end, range) && selected(record.locationId, locationIds));
  }

  async listTimesheets(range: DateRange, locationIds?: number[]): Promise<TimesheetRecord[]> {
    return timesheets.filter(
      (record) => overlaps(record.start, record.end, range) && selected(record.locationId, locationIds),
    );
  }

  async listEmployees(locationIds?: number[]): Promise<EmployeeRecord[]> {
    return employees.filter((record) => selected(record.locationId, locationIds));
  }

  async listLeave(range: DateRange, employeeIds?: number[]): Promise<LeaveRecord[]> {
    return leave.filter((record) => overlaps(record.start, record.end, range) && selected(record.employeeId, employeeIds));
  }

  async listAvailability(range: DateRange, employeeIds?: number[]): Promise<AvailabilityRecord[]> {
    return availability.filter(
      (record) => overlaps(record.start, record.end, range) && selected(record.employeeId, employeeIds),
    );
  }

  async listLocations(): Promise<LocationRecord[]> {
    return locations;
  }
}
