"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Badge, BadgeData, BadgeEvent } from '@/components/badges/Badge';

// Avery 5392 (and same-template 5390-series 3"x4" inserts): letter sheet,
// 2 columns x 3 rows of 4" x 3" inserts, 0.25" side margin, 1" top margin.
// Badges are vertical (3" x 4"), so each one is turned 90° to fit its insert.
const PER_SHEET = 6;
const LEFT_IN = 0.25;
const TOP_IN = 1;
const CELL_W_IN = 4;
const CELL_H_IN = 3;
const NUDGE_KEY = 'tt_badge_nudge_mm';

type Nudge = { x: number; y: number };

function readNudge(): Nudge {
  try {
    const raw = localStorage.getItem(NUDGE_KEY);
    if (raw) {
      const n = JSON.parse(raw);
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) return n;
    }
  } catch {}
  return { x: 0, y: 0 };
}

export function BadgePrintClient({
  courseId,
  badges,
  event,
}: {
  courseId: string;
  badges: BadgeData[];
  event: BadgeEvent;
}) {
  const [start, setStart] = useState(1);
  const [nudge, setNudge] = useState<Nudge>({ x: 0, y: 0 });
  const [guides, setGuides] = useState(false);

  useEffect(() => setNudge(readNudge()), []);
  useEffect(() => {
    try {
      localStorage.setItem(NUDGE_KEY, JSON.stringify(nudge));
    } catch {}
  }, [nudge]);

  // Empty slots first (already-used spots on a partly used sheet), then badges.
  const sheets = useMemo(() => {
    const slots: (BadgeData | null)[] = [...Array(start - 1).fill(null), ...badges];
    const out: (BadgeData | null)[][] = [];
    for (let i = 0; i < slots.length; i += PER_SHEET) out.push(slots.slice(i, i + PER_SHEET));
    return out;
  }, [badges, start]);

  const sheetCount = sheets.length;

  return (
    <div className="badge-print-page">
      <style>{`
        @page { size: letter; margin: 0; }
        .badge-print-page { background: #e5e7eb; min-height: 100vh; color: #111827; }
        .badge-sheet { width: 8.5in; height: 11in; position: relative; background: #fff; margin: 0 auto 0.4in; box-shadow: 0 1px 4px rgba(0,0,0,.2); overflow: hidden; }
        .badge-cell { position: absolute; width: ${CELL_W_IN}in; height: ${CELL_H_IN}in; }
        .badge-cell .badge-rot { position: absolute; left: 0.5in; top: -0.5in; transform: rotate(-90deg); }
        .badge-cell.outline { outline: 1px dashed #9ca3af; outline-offset: -1px; }
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .badge-sheets, .badge-sheets * { visibility: visible; }
          .badge-sheets { position: absolute; left: 0; top: 0; }
          html, body { height: auto !important; min-height: 0 !important; }
          .badge-print-page { background: #fff; min-height: 0; height: 0; }
          .badge-sheet { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
          .badge-sheet:last-child { break-after: auto; page-break-after: auto; }
          .badge-cell.outline.screen-only { outline: none; }
          .print-controls { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-controls max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link
          href={`/admin/certificates/${courseId}/badges`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to badges
        </Link>

        <div className="bg-white rounded-xl p-5 space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold">Print badges</h1>
              <p className="text-gray-600">
                {badges.length} badge{badges.length === 1 ? '' : 's'} on {sheetCount} Avery 5392 sheet
                {sheetCount === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!badges.length}
              className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>

          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>In the print dialog choose <strong>Letter</strong>, scale <strong>100% / Actual size</strong> (not &ldquo;Fit to page&rdquo;), and margins <strong>None</strong> if offered.</li>
            <li>Paper type: <strong>Matte</strong> or <strong>Presentation Paper Matte</strong>. Load one sheet at a time.</li>
            <li>First time on a printer: print one page on plain paper, hold it over an Avery sheet and check the badges line up.</li>
          </ul>

          <div className="grid sm:grid-cols-3 gap-4">
            <label>
              <span className="block font-medium mb-1">Start at spot</span>
              <select
                value={start}
                onChange={(e) => setStart(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {n === 1 ? ' (full sheet)' : ` (skip ${n - 1} used)`}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-gray-500 mt-1">Spots go left to right, top to bottom.</span>
            </label>
            <label>
              <span className="block font-medium mb-1">Shift right (mm)</span>
              <input
                type="number"
                step={0.5}
                value={nudge.x}
                onChange={(e) => setNudge((n) => ({ ...n, x: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="block text-xs text-gray-500 mt-1">Negative moves left. Remembered on this computer.</span>
            </label>
            <label>
              <span className="block font-medium mb-1">Shift down (mm)</span>
              <input
                type="number"
                step={0.5}
                value={nudge.y}
                onChange={(e) => setNudge((n) => ({ ...n, y: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="block text-xs text-gray-500 mt-1">Negative moves up.</span>
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
            Print the cut lines too (useful for the plain-paper alignment test)
          </label>
        </div>
      </div>

      <div className="badge-sheets">
        {sheets.map((sheet, si) => (
          <div key={si} className="badge-sheet">
            {Array.from({ length: PER_SHEET }).map((_, ci) => {
              const col = ci % 2;
              const row = Math.floor(ci / 2);
              const b = sheet[ci];
              return (
                <div
                  key={ci}
                  className={`badge-cell outline ${guides ? '' : 'screen-only'}`}
                  style={{
                    left: `calc(${LEFT_IN + col * CELL_W_IN}in + ${nudge.x}mm)`,
                    top: `calc(${TOP_IN + row * CELL_H_IN}in + ${nudge.y}mm)`,
                  }}
                >
                  {b && (
                    <div className="badge-rot">
                      <Badge badge={b} event={event} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
