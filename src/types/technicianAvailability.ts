export const SCHEDULING_WINDOWS = [
  {
    id: "08:00-09:00",
    label: "8:00 AM - 9:00 AM",
  },
  {
    id: "09:00-10:00",
    label: "9:00 AM - 10:00 AM",
  },
  {
    id: "10:00-11:00",
    label: "10:00 AM - 11:00 AM",
  },
  {
    id: "11:00-12:00",
    label: "11:00 AM - 12:00 PM",
  },
  {
    id: "12:00-13:00",
    label: "12:00 PM - 1:00 PM",
  },
  {
    id: "13:00-14:00",
    label: "1:00 PM - 2:00 PM",
  },
  {
    id: "14:00-15:00",
    label: "2:00 PM - 3:00 PM",
  },
  {
    id: "15:00-16:00",
    label: "3:00 PM - 4:00 PM",
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

const DEFAULT_WEEKDAY_WINDOWS: SchedulingWindowId[] =
  SCHEDULING_WINDOWS.map((window) => window.id);

export const DEFAULT_WEEKDAY_SCHEDULE: TechnicianWeeklySchedule = {
  monday: [...DEFAULT_WEEKDAY_WINDOWS],
  tuesday: [...DEFAULT_WEEKDAY_WINDOWS],
  wednesday: [...DEFAULT_WEEKDAY_WINDOWS],
  thursday: [...DEFAULT_WEEKDAY_WINDOWS],
  friday: [...DEFAULT_WEEKDAY_WINDOWS],
  saturday: [],
  sunday: [],
};