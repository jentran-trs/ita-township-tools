"use client";

import { Users, Building2, UserPlus, X } from "lucide-react";

export type AmoMode = "individual_update" | "organization_update" | "individual_new";

// Forces the superadmin to declare the intent of an AMO export before it runs.
// The chosen type fully determines which columns the export contains:
//   individual_update   — update existing people (keyed by Individual AMO ID)
//   organization_update — update township orgs/addresses (one row per township)
//   individual_new      — import new people (no Individual AMO ID column)
export default function AmoExportModal({
  open,
  onCancel,
  onChoose,
}: {
  open: boolean;
  onCancel: () => void;
  onChoose: (mode: AmoMode) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Choose export type</h2>
          <button onClick={onCancel} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Which AMO import is this file for? This controls exactly which columns
          are included.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onChoose("individual_update")}
            className="w-full text-left border border-gray-300 dark:border-gray-700 rounded-md p-4 hover:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <Users className="w-4 h-4" /> Export for Individual AMO Update
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Updates existing people. Includes Individual AMO ID, organization,
              county, name, title, email, phone, login enabled, and member type.
            </div>
          </button>

          <button
            onClick={() => onChoose("organization_update")}
            className="w-full text-left border border-gray-300 dark:border-gray-700 rounded-md p-4 hover:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <Building2 className="w-4 h-4" /> Export for Organization AMO Update
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Updates township orgs — one row per township. Organization AMO ID,
              name, region, county, and the street + mailing address block.
            </div>
          </button>

          <button
            onClick={() => onChoose("individual_new")}
            className="w-full text-left border border-gray-300 dark:border-gray-700 rounded-md p-4 hover:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <UserPlus className="w-4 h-4" /> Export for Individual AMO New
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Imports new people. Same columns as the individual update,{" "}
              <span className="font-medium">without</span> the Individual AMO ID
              column (AMO assigns one on import).
            </div>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={onCancel}
            className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
