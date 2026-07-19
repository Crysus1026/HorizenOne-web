export const SCHEDULING_WINDOWS = [
  {
    id: "8-10",
    label: "8:00 AM - 10:00 AM",
  },
  {
    id: "10-12",
    label: "10:00 AM - 12:00 PM",
  },
  {
    id: "12-2",
    label: "12:00 PM - 2:00 PM",
  },
  {
    id: "2-4",
    label: "2:00 PM - 4:00 PM",
  },
] as const;

export type SchedulingWindowId =
  (typeof SCHEDULING_WINDOWS)[number]["id"];

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TechnicianWeeklySchedule = Record<
  Weekday,
  SchedulingWindowId[]
>;

export type TechnicianAvailability = {
  id: string;
  companyId: string;
  technicianId: string;
  technicianName: string;
  projectIds: string[];
  timezone: string;
  weeklySchedule: TechnicianWeeklySchedule;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
};

export type TechnicianAvailabilityException = {
  id: string;
  companyId: string;
  technicianId: string;
  date: string;
  unavailableWindows: SchedulingWindowId[];
  reason: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
};

export const EMPTY_WEEKLY_SCHEDULE: TechnicianWeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export const DEFAULT_WEEKDAY_SCHEDULE: TechnicianWeeklySchedule = {
  monday: ["8-10", "10-12", "12-2", "2-4"],
  tuesday: ["8-10", "10-12", "12-2", "2-4"],
  wednesday: ["8-10", "10-12", "12-2", "2-4"],
  thursday: ["8-10", "10-12", "12-2", "2-4"],
  friday: ["8-10", "10-12", "12-2", "2-4"],
  saturday: [],
  sunday: [],
};