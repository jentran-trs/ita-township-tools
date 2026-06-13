"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check, Loader2 } from 'lucide-react';

// Convert a stored ISO timestamp to a value for <input type="datetime-local">
// in the browser's local time. Empty when not set.
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function SubmissionWindow({
  id,
  opensAt,
  closesAt,
}: {
  id: string;
  opensAt: string | null;
  closesAt: string | null;
}) {
  const router = useRouter();
  const [opens, setOpens] = useState(toLocalInput(opensAt));
  const [closes, setCloses] = useState(toLocalInput(closesAt));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (opens && closes && new Date(opens).getTime() >= new Date(closes).getTime()) {
      setError('The opening time must be before the closing time.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-qa/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submit_opens_at: opens ? new Date(opens).toISOString() : null,
          submit_closes_at: closes ? new Date(closes).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setOpens('');
    setCloses('');
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold">Submission window</h2>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Optional. Attendees can only submit between these times (your local time). Leave a field
        blank for no limit on that end.
      </p>
      {error && <div className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Opens
          <input
            type="datetime-local"
            value={opens}
            onChange={(e) => setOpens(e.target.value)}
            className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Closes
          <input
            type="datetime-local"
            value={closes}
            onChange={(e) => setCloses(e.target.value)}
            className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${
              saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saved ? 'Saved' : 'Save window'}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
