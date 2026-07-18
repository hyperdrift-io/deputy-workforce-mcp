import type {
  AvailabilityRecord,
  EmployeeRecord,
  LeaveRecord,
  LocationRecord,
  RosterRecord,
  TimesheetRecord,
} from "../deputy/contracts.js";

export const locations: LocationRecord[] = [
  { id: 101, label: "Harbour Store", timezone: "Europe/London", active: true },
  { id: 102, label: "Garden Store", timezone: "Europe/London", active: true },
];
export const employees: EmployeeRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  label: `Worker ${String(index + 1).padStart(2, "0")}`,
  locationId: index < 5 ? 101 : 102,
  active: true,
}));

function roster(
  id: number,
  day: string,
  startHour: number,
  endHour: number,
  locationId: number,
  employeeId?: number,
): RosterRecord {
  return {
    id,
    start: `${day}T${String(startHour).padStart(2, "0")}:00:00Z`,
    end: `${day}T${String(endHour).padStart(2, "0")}:00:00Z`,
    locationId,
    operationalUnitId: locationId * 10,
    ...(employeeId ? { employeeId } : {}),
    published: true,
    open: !employeeId,
  };
}

export const rosters: RosterRecord[] = [
  roster(1001, "2026-07-20", 8, 16, 101, 1),
  roster(1002, "2026-07-20", 8, 16, 101, 2),
  roster(1003, "2026-07-20", 10, 18, 102, 6),
  roster(1004, "2026-07-21", 8, 16, 101, 1),
  roster(1005, "2026-07-21", 8, 16, 101, 3),
  roster(1006, "2026-07-21", 10, 18, 102, 6),
  roster(1007, "2026-07-22", 8, 16, 101, 1),
  roster(1008, "2026-07-22", 8, 16, 101),
  roster(1009, "2026-07-22", 10, 18, 102, 7),
  roster(1010, "2026-07-23", 8, 16, 101, 1),
  roster(1011, "2026-07-23", 8, 16, 101, 4),
  roster(1012, "2026-07-23", 10, 18, 102, 6),
  roster(1013, "2026-07-24", 8, 16, 101, 1),
  roster(1014, "2026-07-25", 8, 16, 101, 1),
];

function timesheet(
  id: number,
  rosterRecord: RosterRecord,
  startOffsetMinutes = 0,
  endOffsetMinutes = 0,
  validationFlag = 0,
): TimesheetRecord {
  const start = new Date(Date.parse(rosterRecord.start) + startOffsetMinutes * 60_000).toISOString();
  const end = new Date(Date.parse(rosterRecord.end) + endOffsetMinutes * 60_000).toISOString();
  return {
    id,
    start,
    end,
    totalHours: (Date.parse(end) - Date.parse(start)) / 3_600_000,
    employeeId: rosterRecord.employeeId ?? 0,
    locationId: rosterRecord.locationId,
    operationalUnitId: rosterRecord.operationalUnitId,
    rosterId: rosterRecord.id,
    timeApproved: validationFlag === 0,
    validationFlag,
    inProgress: false,
    discarded: false,
  };
}

export const timesheets: TimesheetRecord[] = [
  timesheet(2001, rosters[0]!),
  timesheet(2002, rosters[1]!, 22, 0, 1),
  timesheet(2003, rosters[2]!),
  timesheet(2004, rosters[3]!),
  timesheet(2005, rosters[4]!),
  timesheet(2006, rosters[5]!),
  timesheet(2007, rosters[6]!),
  timesheet(2008, rosters[8]!),
  timesheet(2009, rosters[9]!),
  timesheet(2010, rosters[10]!),
  timesheet(2011, rosters[11]!),
  timesheet(2012, rosters[12]!),
];

export const leave: LeaveRecord[] = [
  {
    id: 3001,
    employeeId: 4,
    locationId: 101,
    start: "2026-07-23T00:00:00Z",
    end: "2026-07-24T00:00:00Z",
    status: 1,
  },
];

export const availability: AvailabilityRecord[] = [
  {
    id: 4001,
    employeeId: 2,
    start: "2026-07-20T12:00:00Z",
    end: "2026-07-20T17:00:00Z",
    unavailable: true,
  },
  {
    id: 4002,
    employeeId: 7,
    start: "2026-07-24T09:00:00Z",
    end: "2026-07-24T14:00:00Z",
    unavailable: true,
  },
];
