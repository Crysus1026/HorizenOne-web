"use client";

import AppShell from "@/components/AppShell";
import {
  DEFAULT_WEEKDAY_SCHEDULE,
  SCHEDULING_WINDOWS,
  type SchedulingWindowId,
  type TechnicianWeeklySchedule,
  type Weekday,
} from "@/types/technicianAvailability";
import {
  getTechnicianAvailability,
  saveTechnicianAvailability,
} from "@/services/technicianAvailability";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Technician = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  projectIds?: string[];
};

const WEEKDAYS: Array<{
  id: Weekday;
  label: string;
}> = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

export default function TechnicianAvailabilityPage() {
  const params = useParams<{ technicianId: string }>();
  const technicianId = params.technicianId;

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [weeklySchedule, setWeeklySchedule] =
    useState<TechnicianWeeklySchedule>(DEFAULT_WEEKDAY_SCHEDULE);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPage() {
      if (!technicianId) {
        setError("Technician ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const technicianSnapshot = await getDoc(
          doc(db, "users", technicianId)
        );

        if (!technicianSnapshot.exists()) {
          setError("Technician was not found.");
          return;
        }

        const loadedTechnician: Technician = {
          id: technicianSnapshot.id,
          ...(technicianSnapshot.data() as Omit<Technician, "id">),
        };

        setTechnician(loadedTechnician);

        if (!loadedTechnician.companyId) {
          setError("Technician is missing a company ID.");
          return;
        }

        const savedAvailability = await getTechnicianAvailability(
          loadedTechnician.companyId,
          technicianId
        );

        if (savedAvailability?.weeklySchedule) {
          setWeeklySchedule(savedAvailability.weeklySchedule);
        } else {
          setWeeklySchedule(DEFAULT_WEEKDAY_SCHEDULE);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load technician availability.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [technicianId]);

  function getTechnicianName() {
    if (!technician) {
      return "Technician";
    }

    return (
      technician.name ||
      `${technician.firstName || ""} ${technician.lastName || ""}`.trim() ||
      "Unnamed Technician"
    );
  }

  function toggleWindow(
    weekday: Weekday,
    windowId: SchedulingWindowId
  ) {
    setWeeklySchedule((currentSchedule) => {
      const currentWindows = currentSchedule[weekday];
      const isSelected = currentWindows.includes(windowId);

      return {
        ...currentSchedule,
        [weekday]: isSelected
          ? currentWindows.filter((id) => id !== windowId)
          : [...currentWindows, windowId],
      };
    });

    setSuccessMessage("");
  }

  function copyMondayToWeekdays() {
    setWeeklySchedule((currentSchedule) => ({
      ...currentSchedule,
      tuesday: [...currentSchedule.monday],
      wednesday: [...currentSchedule.monday],
      thursday: [...currentSchedule.monday],
      friday: [...currentSchedule.monday],
    }));

    setSuccessMessage("");
  }

  function selectAllWeekdays() {
    const allWindows = SCHEDULING_WINDOWS.map(
      (window) => window.id
    ) as SchedulingWindowId[];

    setWeeklySchedule((currentSchedule) => ({
      ...currentSchedule,
      monday: [...allWindows],
      tuesday: [...allWindows],
      wednesday: [...allWindows],
      thursday: [...allWindows],
      friday: [...allWindows],
    }));

    setSuccessMessage("");
  }

  function clearSchedule() {
    setWeeklySchedule({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    });

    setSuccessMessage("");
  }

  async function handleSave() {
    if (!technician) {
      setError("Technician information is unavailable.");
      return;
    }

    if (!technician.companyId) {
      setError("Technician is missing a company ID.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      await saveTechnicianAvailability({
        companyId: technician.companyId,
        technicianId: technician.id,
        technicianName: getTechnicianName(),
        projectIds: technician.projectIds ?? [],
        timezone: "America/New_York",
        weeklySchedule,
      });

      setSuccessMessage("Availability saved successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to save technician availability.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/admin/technicians"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Technicians
          </Link>

          <div className="mt-4">
            <h1 className="text-3xl font-bold">
              Technician Availability
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Configure the recurring weekly schedule for this technician.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              Loading availability...
            </div>
          ) : technician ? (
            <>
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {getTechnicianName()}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Technician ID: {technician.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllWeekdays}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Select Weekdays
                    </button>

                    <button
                      type="button"
                      onClick={copyMondayToWeekdays}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Copy Monday
                    </button>

                    <button
                      type="button"
                      onClick={clearSchedule}
                      className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Clear Schedule
                    </button>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-400">
                          Day
                        </th>

                        {SCHEDULING_WINDOWS.map((window) => (
                          <th
                            key={window.id}
                            className="border-b border-slate-800 px-4 py-3 text-center text-sm font-medium text-slate-400"
                          >
                            {window.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {WEEKDAYS.map((weekday) => (
                        <tr key={weekday.id}>
                          <td className="border-b border-slate-800 px-4 py-4 font-medium text-white">
                            {weekday.label}
                          </td>

                          {SCHEDULING_WINDOWS.map((window) => {
                            const isSelected =
                              weeklySchedule[weekday.id].includes(
                                window.id
                              );

                            return (
                              <td
                                key={window.id}
                                className="border-b border-slate-800 px-4 py-4 text-center"
                              >
                                <label className="inline-flex cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleWindow(
                                        weekday.id,
                                        window.id
                                      )
                                    }
                                    className="h-5 w-5 cursor-pointer accent-cyan-500"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Availability"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}