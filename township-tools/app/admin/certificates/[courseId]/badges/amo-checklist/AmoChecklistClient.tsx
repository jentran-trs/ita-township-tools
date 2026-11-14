'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

export type ChecklistPerson = {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  place: string;
  walkIn: boolean;
  status: 'attended' | 'review' | 'no_show';
  reasons: string[];
  times: { day: string; in: string | null; out: string | null }[];
};

type Props = {
  courseId: string;
  courseName: string;
  courseCode: string;
  dates: string;
  multiDay: boolean;
  people: ChecklistPerson[];
};

const SECTIONS: { status: ChecklistPerson['status']; title: string; note: string }[] = [
  { status: 'attended', title: 'Attended', note: 'Mark these people as attended in AMO.' },
  {
    status: 'review',
    title: 'Needs review',
    note: 'Check the reason first (fix it on the Badges & check-in page), then update AMO.',
  },
  { status: 'no_show', title: 'Not scanned', note: 'Never checked in. Mark as not attended in AMO if you track that.' },
];

export function AmoChecklistClient({ courseId, courseName, courseCode, dates, multiDay, people }: Props) {
  // Ticks are saved in this browser so you can stop and come back.
  const storeKey = `tt_amo_checklist_${courseId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [showTimes, setShowTimes] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, [storeKey]);
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storeKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  const clear = () => {
    if (!confirm('Clear all ticks on this checklist?')) return;
    setDone({});
    try {
      localStorage.removeItem(storeKey);
    } catch {}
  };

  const tickedCount = people.filter((p) => done[p.id]).length;

  return (
    <div className="amo-checklist bg-white text-gray-900 min-h-screen">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          .no-print { display: none !important; }
          .amo-checklist { font-size: 10.5pt; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
          section { break-inside: auto; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="no-print flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/admin/certificates/${courseId}/badges`}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mr-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Badges & check-in
          </Link>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTimes} onChange={(e) => setShowTimes(e.target.checked)} />
            Show check-in/out times
          </label>
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Clear ticks
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#2B3E50] text-white hover:bg-[#1a2633]"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <header className="mb-4">
          <h1 className="text-xl font-bold">AMO attendance checklist</h1>
          <div className="text-sm text-gray-700">
            {courseName} ({courseCode}) · {dates}
            {showTimes ? ' · times are Eastern' : ''}
          </div>
          <div className="text-sm text-gray-700 mt-1">
            {SECTIONS.map((s) => `${s.title}: ${people.filter((p) => p.status === s.status).length}`).join(' · ')}
            <span className="no-print"> · Ticked off: {tickedCount} of {people.length}</span>
          </div>
          <p className="no-print text-xs text-gray-500 mt-1">
            Tick each person once you&apos;ve updated them in AMO. Ticks are saved in this browser. Everyone is in last-name
            order. Walk-ins may not be in AMO yet.
          </p>
        </header>

        {SECTIONS.map((s) => {
          const list = people.filter((p) => p.status === s.status);
          if (!list.length) return null;
          return (
            <section key={s.status} className="mb-6">
              <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1">
                {s.title} ({list.length})
              </h2>
              <p className="text-xs text-gray-600 mt-1 mb-2">{s.note}</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-400">
                    <th className="w-12 py-1 pr-2">Done</th>
                    <th className="py-1 pr-2">Name</th>
                    <th className="py-1 pr-2">Email</th>
                    <th className="py-1 pr-2">Township / organization</th>
                    {s.status === 'review' && <th className="py-1 pr-2">Why</th>}
                    {showTimes && s.status !== 'no_show' && <th className="py-1">{multiDay ? 'In / out by day' : 'In / out'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-200 align-top ${done[p.id] ? 'text-gray-400 print:text-gray-900' : ''}`}
                    >
                      <td className="py-1.5">
                        <input
                          type="checkbox"
                          checked={!!done[p.id]}
                          onChange={() => toggle(p.id)}
                          className="w-4 h-4"
                          aria-label={`Updated ${p.firstName} ${p.lastName} in AMO`}
                        />
                      </td>
                      <td className="py-1.5 pr-2 font-medium whitespace-nowrap">
                        {p.lastName}, {p.firstName}
                        {p.walkIn && (
                          <span className="ml-1 text-[10px] font-semibold uppercase border border-amber-600 text-amber-700 rounded px-1">
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 break-words">{p.email}</td>
                      <td className="py-1.5 pr-2">{p.place}</td>
                      {s.status === 'review' && <td className="py-1.5 pr-2 text-amber-800">{p.reasons.join('; ')}</td>}
                      {showTimes && s.status !== 'no_show' && (
                        <td className="py-1.5 whitespace-nowrap text-xs">
                          {p.times.map((t) => (
                            <div key={t.day}>
                              {multiDay && <span className="text-gray-500">{t.day}: </span>}
                              {t.in || '—'} – {t.out || '—'}
                            </div>
                          ))}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        {!people.length && <p className="text-sm text-gray-500">No registrants on this course yet.</p>}
      </div>
    </div>
  );
}
