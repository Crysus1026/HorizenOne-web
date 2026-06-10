"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

type ServiceType = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiredSkills: string[];
  isActive: boolean;
};

export default function ServiceTypesPage() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadServiceTypes() {
      try {
        const serviceTypesQuery = query(
          collection(db, "serviceTypes"),
          orderBy("name", "asc")
        );

        const snapshot = await getDocs(serviceTypesQuery);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceType[];

        setServiceTypes(data);
      } catch (error) {
        console.error("Error loading service types:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadServiceTypes();
  }, []);

  const filteredServiceTypes = serviceTypes.filter((serviceType) => {
    const search = searchTerm.toLowerCase();

    return (
      serviceType.name?.toLowerCase().includes(search) ||
      serviceType.description?.toLowerCase().includes(search)
    );
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Service Types</h1>
            <p className="mt-2 text-slate-400">
              Manage the services available for work order creation.
            </p>
          </div>

          <Link
            href="/admin/service-types/new"
            className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
          >
            + New Service Type
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4">
            <input
              type="text"
              placeholder="Search service types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            />
          </div>

          {isLoading ? (
            <div className="p-6 text-slate-400">Loading service types...</div>
          ) : filteredServiceTypes.length === 0 ? (
            <div className="p-6 text-slate-400">No service types found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Service Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredServiceTypes.map((serviceType) => (
                    <tr
                      key={serviceType.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        <Link
                          href={`/admin/service-types/${serviceType.id}`}
                          className="hover:text-blue-400"
                        >
                          {serviceType.name}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {serviceType.description || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {serviceType.durationMinutes || 0} min
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {serviceType.requiredSkills?.length
                          ? serviceType.requiredSkills.join(", ")
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        {serviceType.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}