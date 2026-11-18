"use client";

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';

// Files to print for the event, on the badge print page (Lydia's PIN link and
// the admin print page): copies needed, Download, and a "Printed" tick.

export type PrintFileRow = {
  id: string;
  file_name: string;
  size_bytes: number | null;
  copies: number;
  printed_at: string | null;
  printed_by: string | null;
  download_url: string | null;
};

export const fileSize = (n: number | null) =>
  n == null ? '' : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const printedWhen = (at: string) =>
  new Date(at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function PrintFilesList({ api }: { api: string }) {
  const [files, setFiles] = useState<PrintFileRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(api, { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load files');
      setFiles(json.files);
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (f: PrintFileRow) => {
    setBusy(f.id);
    try {
      const res = await fetch(api, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: f.id, printed: !f.printed_at }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!files) return <p className="text-sm text-gray-500">Loading files…</p>;
  if (!files.length) return null;

  const left = files.filter((f) => !f.printed_at).length;
  return (
    <div className="bg-white rounded-xl p-5 text-sm space-y-3">
      <div>
        <div className="font-bold">Other files to print</div>
        <p className="text-gray-600">
          {left ? `${left} of ${files.length} still to print.` : 'All printed.'} Download each one, print the number of copies
          shown, then tick <strong>Printed</strong>.
        </p>
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {files.map((f) => (
          <li key={f.id} className={`px-3 py-2.5 flex items-center gap-3 ${f.printed_at ? 'bg-green-50' : ''}`}>
            <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium break-words">{f.file_name}</div>
              <div className="text-xs text-gray-500">
                <strong className="text-gray-900">
                  {f.copies} cop{f.copies === 1 ? 'y' : 'ies'}
                </strong>
                {f.size_bytes ? ` · ${fileSize(f.size_bytes)}` : ''}
                {f.printed_at ? ` · Printed ${printedWhen(f.printed_at)}` : ''}
              </div>
            </div>
            {f.download_url && (
              <a
                href={f.download_url}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
            <label className="flex items-center gap-1.5 font-semibold flex-shrink-0 cursor-pointer">
              {busy === f.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <input type="checkbox" checked={!!f.printed_at} onChange={() => toggle(f)} className="h-5 w-5 accent-green-600" />
              )}
              Printed
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
