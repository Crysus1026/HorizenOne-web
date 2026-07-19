import type {
  SchedulingWindowId,
  Weekday,
} from "@/types/technicianAvailability";

export function getSchedulingWindowId(
  timeWindow: string
): SchedulingWindowId | null {
  const windowMap: Record<string, SchedulingWindowId> = {
    "8:00 AM - 10:00 AM": "8-10",
    "10:00 AM - 12:00 PM": "10-12",
    "12:00 PM - 2:00 PM": "12-2",
    "2:00 PM - 4:00 PM": "2-4",
  };

  return windowMap[timeWindow] ?? null;
}

export function getWeekdayFromDate(dateString: string): Weekday | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const weekdays: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdays[date.getDay()];
}