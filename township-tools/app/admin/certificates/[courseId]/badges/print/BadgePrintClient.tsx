"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Download, Loader2, Printer } from 'lucide-react';
import { BadgeBack, BadgeData, BadgeEvent, BadgeFront } from '@/components/badges/Badge';

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
  'Print the 2-sided PDF (or click "Print 2-sided").',
  'In the print dialog: Letter, scale 100% / Actual size (not "Fit to page"), 2-sided / duplex ON, flip on long edge, paper type Matte or card stock.',
  'Print one sheet first and check each QR code is behind the right badge.',
];
const PRINT_STEPS_ONE_SIDED = [
  'Paper: Avery 5390 name badge inserts (3.5" x 2.25", 8 per sheet).',
  'Print the fronts PDF (or click "1. Print fronts"): Letter, scale 100% / Actual size (not "Fit to page"), paper type Matte or card stock.',
  'Flip the printed sheets over left to right (like turning a page), keep the top edge going in first, and put them back in the same order.',
  'Print the backs PDF (or click "2. Print backs").',
  'Test one sheet on plain paper first: hold it up to a window and check each QR code sits behind its badge.',
];

export function BadgePrintClient({
  courseId,
  badges,
  event,
  backHref,
  showShareLink,
}: {
  courseId: string;
  badges: BadgeData[];
  event: BadgeEvent;
  // Admin page only: link back to Badges & check-in, and the link to share with the printer.
  backHref?: string;
  showShareLink?: boolean;
}) {
  const [side, setSide] = useState<Side>('front');
  const [start, setStart] = useState(1);
  const [nudge, setNudge] = useState<Nudge>({ x: 0, y: 0 });
  const [guides, setGuides] = useState(false);
  // While making a PDF, draw exactly what would print (no on-screen guides).
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  // Build a PDF of every sheet for one side, for sending to whoever prints.
  // Each sheet is captured at ~300 dpi and placed full-page on Letter paper,
  // so it prints exactly like the Print button (alignment shift included).
  const downloadPdf = async (s: Side) => {
    setPdfError(null);
    setSide(s);
    setCapturing(true);
    try {
      // html-to-image draws with the browser's own engine (via SVG), so text
      // lands exactly where it is on screen; html2canvas shifts custom fonts.
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      // Let React render the chosen side, then wait for fonts and images.
      await new Promise((r) => setTimeout(r, 200));
      await (document as any).fonts?.ready;
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('.badge-sheets .badge-sheet'));
      await Promise.all(
        nodes.flatMap((n) => Array.from(n.querySelectorAll('img'))).map((img) =>
          img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
        )
      );
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      for (let i = 0; i < nodes.length; i++) {
        setProgress(`Making page ${i + 1} of ${nodes.length}…`);
        // ~300 dpi; the shadow is screen-only decoration.
        const img = await toJpeg(nodes[i], { pixelRatio: 3, quality: 0.92, backgroundColor: '#ffffff', style: { boxShadow: 'none', margin: '0' } });
        if (i > 0) pdf.addPage('letter', 'portrait');
        pdf.addImage(img, 'JPEG', 0, 0, 8.5, 11, undefined, 'FAST');
      }
      const base = event.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'badges';
      pdf.save(`${base}-badges-${s === 'front' ? '1-fronts' : s === 'back' ? '2-backs' : '2-sided'}.pdf`);
    } catch (e: any) {
      setPdfError(e?.message || 'Could not make the PDF. Please try again.');
    } finally {
      setCapturing(false);
      setProgress(null);
    }
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
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" /> Back to badges
          </Link>
        )}
        {showShareLink && <ShareWithPrinter courseId={courseId} eventName={event.name} />}

        <div className="bg-white rounded-xl p-5 space-y-4 text-sm">
          <div>
            <h1 className="text-lg font-bold">Print badges</h1>
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

          <PrintInstructions />

          <div className="border-t border-gray-200 pt-4">
            <div className="font-medium mb-1">Download PDFs</div>
            <p className="text-gray-600 mb-2">
              Same layout as the print buttons. 2-sided printer: the one <strong>2-sided PDF</strong>. One-sided printer: the
              <strong> fronts</strong> and <strong>backs</strong> PDFs.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={() => downloadPdf('front')} disabled={!badges.length || capturing} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {capturing && side === 'front' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download fronts PDF
              </button>
              <button type="button" onClick={() => downloadPdf('back')} disabled={!badges.length || capturing} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {capturing && side === 'back' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download backs PDF
              </button>
              <button type="button" onClick={() => downloadPdf('both')} disabled={!badges.length || capturing} className="inline-flex items-center gap-2 px-4 py-2 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {capturing && side === 'both' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download 2-sided PDF
              </button>
              {progress && <span className="text-gray-500">{progress}</span>}
            </div>
            {pdfError && <p className="text-red-600 mt-2">{pdfError}</p>}
          </div>

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
                    className={`badge-cell ${guides ? 'outline' : capturing ? '' : 'outline screen-only'}`}
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
    <div className="grid md:grid-cols-2 gap-3">
      {block('Printer prints both sides', PRINT_STEPS_TWO_SIDED)}
      {block('Printer prints one side', PRINT_STEPS_ONE_SIDED)}
    </div>
  );
}

function ShareWithPrinter({ courseId, eventName }: { courseId: string; eventName: string }) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/print/${courseId}` : `/print/${courseId}`;
  const message = [
    `Hi Lydia, here are the name badges for ${eventName}.`,
    '',
    `Open this link: ${url}`,
    'Enter the event PIN (I will send it separately). No Township Tools login is needed.',
    'From there you can print directly or download the PDFs.',
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
