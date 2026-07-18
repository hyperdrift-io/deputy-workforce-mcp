import type { DateRange } from "../types.js";

export interface RosterRecord {
  id: number;
  start: string;
  end: string;
  locationId: number;
  operationalUnitId: number;
  employeeId?: number;
  published: boolean;
  open: boolean;
}
export interface TimesheetRecord {
  id: number;
  start: string;
  end: string;
  totalHours: number;
  employeeId: number;
  locationId: number;
  operationalUnitId: number;
  rosterId?: number;
  timeApproved: boolean;
  validationFlag: number;
  inProgress: boolean;
  discarded: boolean;
}

export interface EmployeeRecord {
  id: number;
  label: string;
  locationId: number;
  active: boolean;
}

export interface LeaveRecord {
  id: number;
  employeeId: number;
  locationId: number;
  start: string;
  end: string;
  status: number;
}

export interface AvailabilityRecord {
  id: number;
  employeeId: number;
  start: string;
  end: string;
  unavailable: boolean;
}

export interface LocationRecord {
  id: number;
  label: string;
  timezone: string;
  active: boolean;
}

export interface DeputyGateway {
  listRosters(range: DateRange, locationIds?: number[]): Promise<RosterRecord[]>;
  listTimesheets(range: DateRange, locationIds?: number[]): Promise<TimesheetRecord[]>;
  listEmployees(locationIds?: number[]): Promise<EmployeeRecord[]>;
  listLeave(range: DateRange, employeeIds?: number[]): Promise<LeaveRecord[]>;
  listAvailability(range: DateRange, employeeIds?: number[]): Promise<AvailabilityRecord[]>;
  listLocations(): Promise<LocationRecord[]>;
}
