"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Printer } from 'lucide-react';
import { BadgeBack, BadgeData, BadgeEvent, BadgeFront } from '@/components/badges/Badge';
import { PrintFilesList } from '@/components/badges/PrintFilesList';

// Avery 5390: letter sheet, 2 x 4 inserts of 3.5" x 2.25", no gaps,
// 0.75" side margins, 1" top margin.
const SHEET = { cols: 2, rows: 4, cellW: 3.5, cellH: 2.25, left: 0.75, top: 1 };
const NUDGE_KEY = 'tt_badge_nudge_mm';

type Nudge = { x: number; y: number };
// 'both' = front, back, front, back… for printers that print both sides.
type Side = 'front' | 'back' | 'both';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

// Plain-text printing instructions, shown on the page and copied into the
// message for whoever prints the badges.
const PRINT_STEPS_TWO_SIDED = [
  'Paper: Avery 5390 name badge inserts (3.5" x 2.25", 8 per sheet).',
  'Click "Print 2-sided".',
  'In the print dialog: Letter, scale 100% / Actual size (not "Fit to page"), 2-sided / duplex ON, flip on long edge, paper type Matte or card stock.',
  'Print one sheet first and check each QR code is behind the right badge.',
];
const PRINT_STEPS_ONE_SIDED = [
  'Paper: Avery 5390 name badge inserts (3.5" x 2.25", 8 per sheet).',
  'Click "1. Print fronts". In the print dialog: Letter, scale 100% / Actual size (not "Fit to page"), paper type Matte or card stock.',
  'Flip the printed sheets over left to right (like turning a page), keep the top edge going in first, and put them back in the same order.',
  'Click "2. Print backs".',
  'Test one sheet on plain paper first: hold it up to a window and check each QR code sits behind its badge.',
];

export function BadgePrintClient({
  courseId,
  badges: allBadges,
  event,
  backHref,
  showShareLink,
  range,
  filesApi,
}: {
  courseId: string;
  badges: BadgeData[];
  event: BadgeEvent;
  // Admin page only: link back to Badges & check-in, and the link to share with the printer.
  backHref?: string;
  showShareLink?: boolean;
  // Where the event's other files to print come from (admin or PIN API).
  filesApi?: string;
  // Printing only badges #from–#to (e.g. late registrants).
  range?: { from: number | null; to: number | null };
}) {
  const rangeLabel = range ? `#${range.from ?? 1}–${range.to ? `#${range.to}` : 'end'}` : null;
  // Which badges to print: everyone, only those added on one day (e.g. the
  // final AMO import), or walk-ins. ?added=YYYY-MM-DD / ?added=walkin preselects.
  const [batch, setBatch] = useState<string>('all');
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('added');
    if (v) setBatch(v);
  }, []);
  const batches = useMemo(() => {
    const byDay = new Map<string, number>();
    let walkIns = 0;
    allBadges.forEach((b) => {
      if (b.isWalkIn) walkIns += 1;
      else if (b.addedOn) byDay.set(b.addedOn, (byDay.get(b.addedOn) || 0) + 1);
    });
    const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return { days, walkIns };
  }, [allBadges]);
  // Blank badges (no name, number or QR): a walk-in's NIIMBOT label goes on top.
  const [blankSheets, setBlankSheets] = useState(1);
  const isBlank = batch === 'blank-attendee' || batch === 'blank-sponsor';
  const badges = useMemo(() => {
    if (isBlank) {
      const type = batch === 'blank-sponsor' ? 'Sponsor' : 'Attendee';
      return Array.from({ length: Math.max(1, blankSheets) * 8 }, (_, i) => ({
        id: `blank-${i}`,
        firstName: '',
        lastName: '',
        title: null,
        township: null,
        county: null,
        registrantType: type,
        qrSrc: '',
        blank: true,
      })) as BadgeData[];
    }
    return batch === 'all'
      ? allBadges
      : batch === 'walkin'
        ? allBadges.filter((b) => b.isWalkIn)
        : allBadges.filter((b) => !b.isWalkIn && b.addedOn === batch);
  }, [allBadges, batch, isBlank, blankSheets]);
  const chooseBatch = (v: string) => {
    setBatch(v);
    try {
      const u = new URL(window.location.href);
      if (v === 'all') u.searchParams.delete('added');
      else u.searchParams.set('added', v);
      window.history.replaceState(null, '', u.toString());
    } catch {}
  };
  const dayName = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const batchLabel =
    batch === 'all'
      ? null
      : batch === 'walkin'
        ? 'walk-ins only'
        : batch === 'blank-attendee'
          ? 'blank Attendee badges'
          : batch === 'blank-sponsor'
            ? 'blank Sponsor badges'
            : `added ${dayName(batch)} only`;

  const [side, setSide] = useState<Side>('front');
  const [start, setStart] = useState(1);
  const [nudge, setNudge] = useState<Nudge>({ x: 0, y: 0 });
  // Cut lines print by default (plain-paper alignment test); untick for Avery sheets if preferred.
  const [guides, setGuides] = useState(true);

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
    <div className="badge-print-page lg:flex lg:items-start">
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
          .badge-sheets { position: absolute; left: 0; top: 0; padding: 0 !important; overflow: visible !important; }
          .badge-print-page { background: #fff; min-height: 0; height: 0; }
          .badge-sheet { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
          .badge-sheet:last-child { break-after: auto; page-break-after: auto; }
          .badge-cell.outline.screen-only { outline: none; }
          .print-controls { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-controls max-w-3xl mx-auto px-4 py-6 space-y-4 lg:mx-0 lg:max-w-none lg:w-1/3 lg:min-w-[24rem] lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-gray-300">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" /> Back to badges
          </Link>
        )}
        {filesApi && <PrintFilesList api={filesApi} />}
        {showShareLink && (
          <ShareWithPrinter
            courseId={courseId}
            eventName={event.name}
            range={range}
            rangeLabel={rangeLabel}
            added={batch === 'all' || isBlank ? null : batch}
            addedLabel={batch === 'all' || isBlank ? null : batch === 'walkin' ? 'the walk-in badges' : `the badges added ${dayName(batch)}`}
          />
        )}

        <div className="bg-white rounded-xl p-5 space-y-4 text-sm">
          <div>
            <h1 className="text-lg font-bold">
              Print badges{rangeLabel ? ` ${rangeLabel} only` : ''}
              {batchLabel ? ` · ${batchLabel}` : ''}
            </h1>
            {(
              <label className="block my-2">
                <span className="block font-medium mb-1">Which badges</span>
                <select value={batch} onChange={(e) => chooseBatch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="all">All badges ({allBadges.length})</option>
                  {batches.days.map(([d, n]) => (
                    <option key={d} value={d}>
                      Added {dayName(d)} ({n})
                    </option>
                  ))}
                  {batches.walkIns > 0 && <option value="walkin">Walk-ins ({batches.walkIns})</option>}
                  <option value="blank-attendee">Blank badges · Attendee</option>
                  <option value="blank-sponsor">Blank badges · Sponsor</option>
                </select>
                <span className="block text-xs text-gray-500 mt-1">
                  To print only the people added in the latest import, pick that day. Blank badges have only the
                  Attendee/Sponsor bar, for walk-ins: stick their NIIMBOT label in the middle.
                </span>
              </label>
            )}
            {isBlank && (
              <label className="block mb-2">
                <span className="block font-medium mb-1">Sheets of blank badges (8 per sheet)</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={blankSheets}
                  onChange={(e) => setBlankSheets(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
            )}
            <p className="text-gray-600">
              {badges.length} badge{badges.length === 1 ? '' : 's'} · {sheets.length} sheet{sheets.length === 1 ? '' : 's'} · Avery 5390 (3.5″ × 2.25″) · names on the front, QR code on the back
            </p>
          </div>



          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => printSide('front')} disabled={!badges.length} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              <Printer className="w-4 h-4" /> 1. Print fronts
            </button>
            <button type="button" onClick={() => printSide('back')} disabled={!badges.length} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-[#1B2E5B] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              <Printer className="w-4 h-4" /> 2. Print backs
            </button>
            <span className="self-center text-gray-400">or</span>
            <button type="button" onClick={() => printSide('both')} disabled={!badges.length} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Printer className="w-4 h-4" /> Print 2-sided
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
            Print the cut lines too (for the plain-paper alignment test)
          </label>

          <PrintInstructions />


          <div>
            <span className="text-gray-500">
              Previewing:{' '}
              <button type="button" onClick={() => setSide('front')} className={side === 'front' ? 'font-semibold underline' : 'hover:underline'}>fronts</button>
              {' / '}
              <button type="button" onClick={() => setSide('back')} className={side === 'back' ? 'font-semibold underline' : 'hover:underline'}>backs</button>
              {' / '}
              <button type="button" onClick={() => setSide('both')} className={side === 'both' ? 'font-semibold underline' : 'hover:underline'}>2-sided</button>
            </span>
          </div>

          <label className="block">
            <span className="block font-medium mb-1">Start at spot</span>
            <select value={start} onChange={(e) => setStart(parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {Array.from({ length: perSheet }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}{n === 1 ? ' (full sheet)' : ` (skip ${n - 1} used)`}</option>
              ))}
            </select>
            <span className="block text-xs text-gray-500 mt-1">To use up a partly used sheet. Spots go left to right, top to bottom on the front.</span>
          </label>

          <details className="border border-gray-200 rounded-lg px-3 py-2" open={nudge.x !== 0 || nudge.y !== 0}>
            <summary className="cursor-pointer font-medium">Printing slightly off? Adjust alignment</summary>
            <p className="text-xs text-gray-500 mt-2">
              Only if the badges land a little off the Avery perforations on this printer. Leave at 0 otherwise.
              Remembered on this computer.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <label>
                <span className="block text-sm mb-1">Shift right (mm)</span>
                <input type="number" step={0.5} value={nudge.x} onChange={(e) => setN('x', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                <span className="block text-xs text-gray-500 mt-1">Negative moves left.</span>
              </label>
              <label>
                <span className="block text-sm mb-1">Shift down (mm)</span>
                <input type="number" step={0.5} value={nudge.y} onChange={(e) => setN('y', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                <span className="block text-xs text-gray-500 mt-1">Negative moves up.</span>
              </label>
            </div>
          </details>
        </div>
      </div>

      <div className="badge-sheets lg:flex-1 lg:min-w-0 overflow-x-auto px-4 py-6">
        <div className="print-controls text-sm text-gray-600 text-center mb-3">
          Preview · {sheets.length * (side === 'both' ? 2 : 1)} page{sheets.length * (side === 'both' ? 2 : 1) === 1 ? '' : 's'} ·{' '}
          {side === 'front' ? 'fronts' : side === 'back' ? 'backs' : 'fronts and backs alternating'} · scroll to see them all
        </div>
        {sheets.flatMap((sheet, si) =>
          (side === 'both' ? (['front', 'back'] as const) : [side as 'front' | 'back']).map((face) => (
            <div key={`${si}-${face}`} className="badge-sheet">
              {Array.from({ length: perSheet }).map((_, ci) => {
                const row = Math.floor(ci / f.cols);
                const frontCol = ci % f.cols;
                // Flipping the sheet on its long edge (by hand, or a 2-sided
                // printer) mirrors the columns, so each back is drawn in the
                // opposite column (and the x shift reverses).
                const col = face === 'front' ? frontCol : f.cols - 1 - frontCol;
                const dx = face === 'front' ? nudge.x : -nudge.x;
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
                    {b && (face === 'front' ? <BadgeFront badge={b} event={event} /> : <BadgeBack badge={b} />)}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this text:', text);
        }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : label}
    </button>
  );
}

function PrintInstructions() {
  const block = (title: string, steps: string[]) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-semibold">{title}</div>
        <CopyButton text={`${title}\n${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`} />
      </div>
      <ol className="list-decimal pl-5 text-gray-700 space-y-0.5">
        {steps.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
    </div>
  );
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-3">
      {block('Printer prints both sides', PRINT_STEPS_TWO_SIDED)}
      {block('Printer prints one side', PRINT_STEPS_ONE_SIDED)}
    </div>
  );
}

function ShareWithPrinter({
  courseId,
  eventName,
  range,
  rangeLabel,
  added,
  addedLabel,
}: {
  courseId: string;
  eventName: string;
  range?: { from: number | null; to: number | null };
  rangeLabel?: string | null;
  added?: string | null;
  addedLabel?: string | null;
}) {
  const q = new URLSearchParams();
  if (range?.from) q.set('from', String(range.from));
  if (range?.to) q.set('to', String(range.to));
  if (added) q.set('added', added);
  const path = `/print/${courseId}${q.toString() ? `?${q}` : ''}`;
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const message = [
    addedLabel
      ? `Hi Lydia, here are the NEW name badges for ${eventName} (${addedLabel}). The link opens with just those selected. Please print them and add them to the box in number order.`
      : rangeLabel
        ? `Hi Lydia, here are the NEW name badges for ${eventName} (badges ${rangeLabel}). Please print just these and add them to the end of the box.`
        : `Hi Lydia, here are the name badges for ${eventName}.`,
    '',
    `Open this link: ${url}`,
    'Enter the event PIN (I will send it separately). No Township Tools login is needed.',
    'Then print straight from that page using the buttons there.',
    '',
    'If your printer prints both sides:',
    ...PRINT_STEPS_TWO_SIDED.map((x, i) => `${i + 1}. ${x}`),
    '',
    'If your printer prints one side only:',
    ...PRINT_STEPS_ONE_SIDED.map((x, i) => `${i + 1}. ${x}`),
  ].join('\n');
  return (
    <div className="bg-white rounded-xl p-5 text-sm space-y-2">
      <div className="font-bold">Send to whoever prints the badges</div>
      <p className="text-gray-600">
        They open this link and enter the <strong>event PIN</strong> (the same one the check-in team uses). No Township Tools
        login needed. Send the PIN separately from the link.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-xs break-all bg-gray-50 border border-gray-200 rounded px-2 py-1">{url}</code>
        <CopyButton text={url} label="Copy link" />
        <CopyButton text={message} label="Copy message with instructions" />
      </div>
    </div>
  );
}
