"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { BadgeBack, BadgeData, BadgeEvent, BadgeFront } from '@/components/badges/Badge';

// Avery 5390: letter sheet, 2 x 4 inserts of 3.5" x 2.25", no gaps,
// 0.75" side margins, 1" top margin.
const SHEET = { cols: 2, rows: 4, cellW: 3.5, cellH: 2.25, left: 0.75, top: 1 };
const NUDGE_KEY = 'tt_badge_nudge_mm';

type Nudge = { x: number; y: number };
type Side = 'front' | 'back';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

export function BadgePrintClient({ courseId, badges, event }: { courseId: string; badges: BadgeData[]; event: BadgeEvent }) {
  const [side, setSide] = useState<Side>('front');
  const [start, setStart] = useState(1);
  const [nudge, setNudge] = useState<Nudge>({ x: 0, y: 0 });
  const [guides, setGuides] = useState(false);

  useEffect(() => {
    const n = readJSON<any>(NUDGE_KEY, null);
    // Saved per paper type by an earlier version; keep the 5390 value.
    const v = n && n['5390'] ? n['5390'] : n;
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y) && n && n['5390']) setNudge(v);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(NUDGE_KEY, JSON.stringify({ '5390': nudge }));
    } catch {}
  }, [nudge]);

  const f = SHEET;
  const perSheet = f.cols * f.rows;

  const sheets = useMemo(() => {
    const slots: (BadgeData | null)[] = [...Array(Math.max(0, start - 1)).fill(null), ...badges];
    const out: (BadgeData | null)[][] = [];
    for (let i = 0; i < slots.length; i += perSheet) out.push(slots.slice(i, i + perSheet));
    return out;
  }, [badges, start, perSheet]);

  const printSide = (s: Side) => {
    setSide(s);
    setTimeout(() => window.print(), 150);
  };

  const setN = (k: keyof Nudge, v: string) => setNudge((cur) => ({ ...cur, [k]: parseFloat(v) || 0 }));

  return (
    <div className="badge-print-page">
      <style>{`
        @page { size: letter; margin: 0; }
        .badge-print-page { background: #e5e7eb; min-height: 100vh; color: #111827; }
        .badge-sheet { width: 8.5in; height: 11in; position: relative; background: #fff; margin: 0 auto 0.4in; box-shadow: 0 1px 4px rgba(0,0,0,.2); overflow: hidden; }
        .badge-cell { position: absolute; }
        .badge-cell.outline { outline: 1px dashed #9ca3af; outline-offset: -1px; }
        @media print {
          html, body { height: auto !important; min-height: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          .badge-sheets, .badge-sheets * { visibility: visible; }
          .badge-sheets { position: absolute; left: 0; top: 0; }
          .badge-print-page { background: #fff; min-height: 0; height: 0; }
          .badge-sheet { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
          .badge-sheet:last-child { break-after: auto; page-break-after: auto; }
          .badge-cell.outline.screen-only { outline: none; }
          .print-controls { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-controls max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link href={`/admin/certificates/${courseId}/badges`} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" /> Back to badges
        </Link>

        <div className="bg-white rounded-xl p-5 space-y-4 text-sm">
          <div>
            <h1 className="text-lg font-bold">Print badges</h1>
            <p className="text-gray-600">
              {badges.length} badge{badges.length === 1 ? '' : 's'} · {sheets.length} sheet{sheets.length === 1 ? '' : 's'} · Avery 5390 (3.5\" × 2.25\") · names on the front, QR code on the back
            </p>
          </div>


          <ol className="list-decimal pl-5 text-gray-700 space-y-1.5">
            <li>
              <strong>Print the fronts.</strong> In the print dialog choose Letter, scale <strong>100% / Actual size</strong>, margins <strong>None</strong>, paper type <strong>Matte</strong>.
            </li>
            <li>
              <strong>Flip the printed sheets over</strong> (turn each one over left to right, like a page in a book), keep the <strong>top edge going into the printer first</strong>, and put them back in the same order.
            </li>
            <li>
              <strong>Print the backs.</strong> Each QR code lands behind the right person. First time on a printer, try this with one plain-paper sheet and hold it up to a window to check.
            </li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => printSide('front')} disabled={!badges.length} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              <Printer className="w-4 h-4" /> 1. Print fronts
            </button>
            <button type="button" onClick={() => printSide('back')} disabled={!badges.length} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-[#1B2E5B] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              <Printer className="w-4 h-4" /> 2. Print backs
            </button>
            <span className="self-center text-gray-500">
              Previewing:{' '}
              <button type="button" onClick={() => setSide('front')} className={side === 'front' ? 'font-semibold underline' : 'hover:underline'}>fronts</button>
              {' / '}
              <button type="button" onClick={() => setSide('back')} className={side === 'back' ? 'font-semibold underline' : 'hover:underline'}>backs</button>
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label>
              <span className="block font-medium mb-1">Start at spot</span>
              <select value={start} onChange={(e) => setStart(parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {Array.from({ length: perSheet }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}{n === 1 ? ' (full sheet)' : ` (skip ${n - 1} used)`}</option>
                ))}
              </select>
              <span className="block text-xs text-gray-500 mt-1">Spots go left to right, top to bottom on the front.</span>
            </label>
            <label>
              <span className="block font-medium mb-1">Shift right (mm)</span>
              <input type="number" step={0.5} value={nudge.x} onChange={(e) => setN('x', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <span className="block text-xs text-gray-500 mt-1">Negative moves left. Remembered on this computer.</span>
            </label>
            <label>
              <span className="block font-medium mb-1">Shift down (mm)</span>
              <input type="number" step={0.5} value={nudge.y} onChange={(e) => setN('y', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <span className="block text-xs text-gray-500 mt-1">Negative moves up. Set these from a front test print.</span>
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
            Print the cut lines too (for the plain-paper alignment test)
          </label>
        </div>
      </div>

      <div className="badge-sheets">
        {sheets.map((sheet, si) => (
          <div key={si} className="badge-sheet">
            {Array.from({ length: perSheet }).map((_, ci) => {
              const row = Math.floor(ci / f.cols);
              const frontCol = ci % f.cols;
              // Flipping the sheet left-to-right mirrors the columns, so each
              // back is drawn in the opposite column (and the x shift reverses).
              const col = side === 'front' ? frontCol : f.cols - 1 - frontCol;
              const dx = side === 'front' ? nudge.x : -nudge.x;
              const b = sheet[ci];
              return (
                <div
                  key={ci}
                  className={`badge-cell outline ${guides ? '' : 'screen-only'}`}
                  style={{
                    width: `${f.cellW}in`,
                    height: `${f.cellH}in`,
                    left: `calc(${f.left + col * f.cellW}in + ${dx}mm)`,
                    top: `calc(${f.top + row * f.cellH}in + ${nudge.y}mm)`,
                  }}
                >
                  {b && (side === 'front' ? <BadgeFront badge={b} event={event} /> : <BadgeBack badge={b} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
