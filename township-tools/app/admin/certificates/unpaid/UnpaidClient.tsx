"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Loader2, RotateCcw, Search } from 'lucide-react';
import { formatCourseDates } from '@/lib/certificates/date-range';
import { townshipLabel } from '@/lib/certificates/township';

type Row = {
  registrant_id: string;
  course_id: string;
  course_name: string;
  course_date: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string | null;
  township: string | null;
  county: string | null;
  organization: string | null;
  balance_due: number | null;
  is_walk_in: boolean;
  attended: boolean;
};

type Person = { key: string; name: string; email: string; place: string; debts: Row[]; total: number };

const money = (n: number) => `$${n.toFixed(2)}`;
const METHODS: [string, string][] = [
  ['card', 'Credit card'],
  ['check', 'Check'],
  ['amo', 'Paid in AMO'],
  ['admin', 'Other / marked paid'],
  ['waived', 'Waive fee'],
];

export function UnpaidClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyRepeat, setOnlyRepeat] = useState(false);
  const [onlyCame, setOnlyCame] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/certificates/unpaid', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load');
      setRows(json.rows);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // One entry per person: same email, else same first + last name.
  const people = useMemo(() => {
    const m = new Map<string, Person>();
    (rows || []).forEach((r) => {
      const key = r.email.trim().toLowerCase() || `${r.first_name} ${r.last_name}`.toLowerCase().replace(/\s+/g, ' ');
      const p = m.get(key) || {
        key,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        place: [townshipLabel(r.township), r.county ? `${r.county} County` : null].filter(Boolean).join(', ') || r.organization || '',
        debts: [],
        total: 0,
      };
      p.debts.push(r);
      p.total += r.balance_due || 0;
      m.set(key, p);
    });
    return Array.from(m.values()).sort((a, b) => b.debts.length - a.debts.length || b.total - a.total || a.name.localeCompare(b.name));
  }, [rows]);

  const q = query.trim().toLowerCase();
  const shown = people.filter(
    (p) =>
      (!onlyRepeat || p.debts.length > 1) &&
      (!onlyCame || p.debts.some((d) => d.attended)) &&
      (!q || `${p.name} ${p.email} ${p.place} ${p.debts.map((d) => d.course_name).join(' ')}`.toLowerCase().includes(q))
  );
  const totalOwed = shown.reduce((n, p) => n + p.total, 0);
  const repeatCount = people.filter((p) => p.debts.length > 1).length;

  const markPaid = async (d: Row, method: string) => {
    if (!method) return;
    setBusy(d.registrant_id);
    try {
      const res = await fetch(`/api/admin/certificates/registrants/${d.registrant_id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const copyEmails = async () => {
    const emails = Array.from(new Set(shown.map((p) => p.email.trim().toLowerCase()).filter(Boolean)));
    const text = emails.join(', ');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(t);
    }
    setCopied(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'}. Paste into the To or BCC field.`);
    setTimeout(() => setCopied(null), 4000);
  };

  if (error && !rows) return <p className="text-sm text-red-600">{error}</p>;
  if (!rows) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Everyone whose registration is still unpaid, at any event (the latest one included). People are matched across
        events by email, or by first and last name when there&apos;s no email. Cancelled registrations aren&apos;t counted.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500">People who owe</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{people.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500">Owe for 2+ events</div>
          <div className="text-2xl font-bold">{repeatCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500">Total owed{shown.length !== people.length ? ' (shown)' : ''}</div>
          <div className="text-2xl font-bold">{money(totalOwed)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone by name, email, township or event…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyRepeat} onChange={(e) => setOnlyRepeat(e.target.checked)} className="h-4 w-4" />
            Only people who owe for 2+ events
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyCame} onChange={(e) => setOnlyCame(e.target.checked)} className="h-4 w-4" />
            Only people who attended (checked in)
          </label>
          <button type="button" onClick={load} className="ml-auto inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:underline">
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={copyEmails}
            disabled={!shown.some((p) => p.email)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-[#1B2E5B] text-white hover:bg-[#15244a] disabled:opacity-40"
          >
            <Copy className="w-4 h-4" /> Copy emails ({shown.filter((p) => p.email).length})
          </button>
          {copied && <span className="text-sm text-green-600">{copied}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {!shown.length ? (
          <p className="text-sm text-gray-500 py-6 text-center">{people.length ? 'No one matches.' : 'Nobody owes anything. 🎉'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-3">Person</th>
                  <th className="py-2 pr-3">Unpaid events</th>
                  <th className="py-2 pr-3 text-right">Total owed</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.key} className="border-b border-gray-100 dark:border-gray-800 align-top">
                    <td className="py-3 pr-3 min-w-[14rem]">
                      <div className="font-semibold">{p.name}</div>
                      {p.place && <div className="text-xs text-gray-500">{p.place}</div>}
                      {p.email ? <div className="text-xs text-gray-500 break-all">{p.email}</div> : <div className="text-xs text-amber-700">No email</div>}
                      {p.debts.length > 1 && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
                          {p.debts.length} events unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <ul className="space-y-2">
                        {p.debts.map((d) => (
                          <li key={d.registrant_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Link href={`/admin/certificates/${d.course_id}#attendance`} className="font-medium hover:underline">
                              {d.course_name}
                            </Link>
                            <span className="text-xs text-gray-500">{d.course_date ? formatCourseDates(d.course_date, null, 'short') : ''}</span>
                            <span className="font-semibold text-red-700 dark:text-red-400">{d.balance_due ? money(d.balance_due) : 'amount not set'}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                d.attended ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {d.attended ? 'Attended' : "Didn't check in"}
                            </span>
                            {d.is_walk_in && <span className="text-xs text-amber-600">walk-in</span>}
                            {busy === d.registrant_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <select
                                value=""
                                onChange={(e) => markPaid(d, e.target.value)}
                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950"
                                aria-label={`Mark ${p.name} paid for ${d.course_name}`}
                              >
                                <option value="">Mark paid…</option>
                                {METHODS.map(([v, label]) => (
                                  <option key={v} value={v}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 text-right font-bold whitespace-nowrap">{p.total ? money(p.total) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
