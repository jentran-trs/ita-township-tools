"use client";

import { UserPlus, RefreshCw, X } from "lucide-react";

export type AmoMode = "update" | "new";

// Forces the superadmin to declare the intent of an AMO export before it runs.
// "update" omits the Username column (so existing AMO logins aren't overwritten);
// "new" keeps it (so new individuals get a login).
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
          How will this file be used in AMO? This controls whether the{" "}
          <span className="font-medium">Username</span> column is included.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onChoose("update")}
            className="w-full text-left border border-gray-300 dark:border-gray-700 rounded-md p-4 hover:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <RefreshCw className="w-4 h-4" /> Export for AMO update
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              For updating existing records. <span className="font-medium">Excludes</span> the
              Username column so current AMO logins aren&apos;t overwritten.
            </div>
          </button>

          <button
            onClick={() => onChoose("new")}
            className="w-full text-left border border-gray-300 dark:border-gray-700 rounded-md p-4 hover:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <UserPlus className="w-4 h-4" /> Export for AMO new
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              For importing new individuals. <span className="font-medium">Includes</span> the
              Username column.
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
