import {
  SCHEDULING_WINDOWS,
  type SchedulingWindowId,
  type Weekday,
} from "@/types/technicianAvailability";

const LEGACY_SCHEDULING_WINDOWS: Record<
  string,
  SchedulingWindowId[]
> = {
  "8-10": ["08:00-09:00", "09:00-10:00"],
  "10-12": ["10:00-11:00", "11:00-12:00"],
  "12-2": ["12:00-13:00", "13:00-14:00"],
  "2-4": ["14:00-15:00", "15:00-16:00"],
};

export function getSchedulingWindowId(
  timeWindow: string
): SchedulingWindowId | null {
  const matchingWindow = SCHEDULING_WINDOWS.find(
    (window) => window.label === timeWindow
  );

  return matchingWindow?.id ?? null;
}

export function normalizeSchedulingWindowIds(
  windowIds: string[]
): SchedulingWindowId[] {
  const normalizedWindowIds =
    new Set<SchedulingWindowId>();

  for (const windowId of windowIds) {
    const legacyWindowIds =
      LEGACY_SCHEDULING_WINDOWS[windowId];

    if (legacyWindowIds) {
      for (const legacyWindowId of legacyWindowIds) {
        normalizedWindowIds.add(legacyWindowId);
      }

      continue;
    }

    const isCurrentWindowId = SCHEDULING_WINDOWS.some(
      (window) => window.id === windowId
    );

    if (isCurrentWindowId) {
      normalizedWindowIds.add(
        windowId as SchedulingWindowId
      );
    }
  }

  return Array.from(normalizedWindowIds);
}

export function getWeekdayFromDate(
  dateString: string
): Weekday | null {
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