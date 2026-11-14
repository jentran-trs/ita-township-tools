// Walk-in label for the NIIMBOT B31: 70 mm long x 40 mm wide labels, black
// thermal, 203 dpi. Drawn on a canvas in the browser at the printer's native
// resolution (8 px/mm → 560 x 320) and saved as a PNG; Jen adds it as a
// picture in the NIIMBOT app (the printer can't be driven from a website).
//
// Layout: event name centred across the top; below it, the name, title and
// township/company centred vertically on the left, and the QR code on the
// right edge.
import QRCode from 'qrcode';
import { townshipLabel } from '@/lib/certificates/township';

export type LabelInput = {
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  organization?: string | null;
  // "Walk-in #2" / "#47", shown above the name.
  numberLabel?: string | null;
  badgeToken: string;
  eventName: string;
};

const PX_PER_MM = 8;
const W = 70 * PX_PER_MM;
const H = 40 * PX_PER_MM;
const PAD = 2.5 * PX_PER_MM;
const HEADER = 7 * PX_PER_MM; // event name strip at the top
const QR = 30 * PX_PER_MM;
const FONT = 'Arial, Helvetica, sans-serif';

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, maxPx: number, minPx: number, maxWidth: number) {
  let size = maxPx;
  while (size > minPx) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${FONT}`;
  return size;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

export async function renderNiimbotLabel(input: LabelInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';

  // Event name, centred across the top.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, input.eventName, 'bold', 26, 16, W - PAD * 2);
  ctx.fillText(ellipsize(ctx, input.eventName, W - PAD * 2), W / 2, PAD + HEADER / 2 - 4);
  ctx.fillRect(PAD, PAD + HEADER, W - PAD * 2, 2);

  // QR code on the right edge, centred in the space under the header.
  // A white gap under the line keeps the QR code's quiet zone, so it scans reliably.
  const bodyTop = PAD + HEADER + 2 + 10;
  const bodyH = H - bodyTop - PAD;
  const qrSize = Math.min(QR, bodyH);
  const qrX = W - PAD - qrSize;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, input.badgeToken, { margin: 0, width: qrSize, errorCorrectionLevel: 'M' });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, qrX, bodyTop + (bodyH - qrSize) / 2, qrSize, qrSize);

  // Name, title, township/company: centred left of the QR, vertically centred.
  const textW = qrX - PAD * 2;
  const cx = PAD + textW / 2;
  const place = [townshipLabel(input.township), input.county ? `${input.county} County` : null].filter(Boolean).join(', ') || input.organization || '';
  type Line = { text: string; weight: string; max: number; min: number; gap: number };
  const lines: Line[] = [
    ...(input.numberLabel ? [{ text: input.numberLabel, weight: 'bold', max: 26, min: 18, gap: 0 }] : []),
    { text: input.firstName, weight: 'bold', max: 56, min: 26, gap: input.numberLabel ? 6 : 0 },
    { text: input.lastName, weight: 'bold', max: 36, min: 20, gap: 2 },
    ...(input.title ? [{ text: input.title, weight: 'normal', max: 22, min: 16, gap: 10 }] : []),
    ...(place ? [{ text: place, weight: 'normal', max: 20, min: 15, gap: 4 }] : []),
  ];
  // Measure first so the whole block can be centred.
  const sized = lines.map((l) => ({ ...l, size: fitFont(ctx, l.text, l.weight, l.max, l.min, textW) }));
  const blockH = sized.reduce((h, l) => h + l.gap + l.size * 1.1, 0);
  let y = bodyTop + (bodyH - blockH) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const l of sized) {
    y += l.gap;
    ctx.font = `${l.weight} ${l.size}px ${FONT}`;
    ctx.fillText(ellipsize(ctx, l.text, textW), cx, y);
    y += l.size * 1.1;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create label image'))), 'image/png')
  );
}

/** Share to the NIIMBOT app on a phone, or download on a computer. */
export async function deliverLabel(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: any) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
