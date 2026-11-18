// Walk-in label for the NIIMBOT B31: 70 mm long x 40 mm wide labels, black
// thermal, 203 dpi. Drawn on a canvas in the browser at the printer's native
// resolution (8 px/mm → 560 x 320) and saved as a PNG; Jen adds it as a
// picture in the NIIMBOT app (the printer can't be driven from a website).
//
// Layout: a header strip with the ITA logo (left), event name + tagline, and
// the badge number big in the top-right corner (like the printed badge); below
// it, the name, title and township/company centred on the left, and the QR
// code on the right edge.
import QRCode from 'qrcode';
import { extraOrganization, townshipLabel } from '@/lib/certificates/township';

export type LabelInput = {
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  organization?: string | null;
  // "Walk-in #2" / "#47", shown big in the top-right corner.
  numberLabel?: string | null;
  badgeToken: string;
  eventName: string;
  tagline?: string | null;
  logoUrl?: string;
};

const PX_PER_MM = 8;
const W = 70 * PX_PER_MM;
const H = 40 * PX_PER_MM;
const PAD = 2.5 * PX_PER_MM;
const HEADER = 11 * PX_PER_MM; // logo + event name (1–2 lines) + tagline + badge number
const QR = 22 * PX_PER_MM;
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderNiimbotLabel(input: LabelInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';

  // ── Header: logo | event name + tagline | badge number ──
  const logo = await loadImage(input.logoUrl || '/badges/ita-logo.png');
  const logoSize = HEADER;
  if (logo) ctx.drawImage(logo, PAD, PAD, logoSize, logoSize);

  // Badge number, big, top-right ("WALK-IN" small above a walk-in's number).
  let numberLeft = W - PAD;
  if (input.numberLabel) {
    const walkIn = /^walk-in/i.test(input.numberLabel);
    const num = walkIn ? input.numberLabel.replace(/^walk-in\s*/i, '') : input.numberLabel;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${walkIn ? 44 : 52}px ${FONT}`;
    const numW = ctx.measureText(num).width;
    ctx.fillText(num, W - PAD, PAD + (walkIn ? HEADER * 0.62 : HEADER / 2));
    let blockW = numW;
    if (walkIn) {
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText('WALK-IN', W - PAD, PAD + HEADER * 0.16);
      blockW = Math.max(numW, ctx.measureText('WALK-IN').width);
    }
    numberLeft = W - PAD - blockW;
  }

  // Event name and tagline between the logo and the number.
  const textLeft = PAD + (logo ? logoSize + 10 : 0);
  const textRight = numberLeft - 10;
  const midW = Math.max(40, textRight - textLeft);
  const midX = textLeft + midW / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Event name as big as fits: one line if it can be large, else two lines.
  const tagSize = input.tagline ? 18 : 0;
  const nameMax = input.tagline ? 40 : 46;
  let nameLines = [input.eventName];
  let nameSize = fitFont(ctx, input.eventName, 'bold', nameMax, 12, midW);
  if (nameSize < 30 && input.eventName.includes(' ')) {
    const words = input.eventName.split(/\s+/);
    let best: string[] = [input.eventName];
    let bestW = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      ctx.font = `bold 30px ${FONT}`;
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w < bestW) {
        bestW = w;
        best = [a, b];
      }
    }
    const twoMax = input.tagline ? 32 : 40;
    const twoSize = Math.min(fitFont(ctx, best[0], 'bold', twoMax, 12, midW), fitFont(ctx, best[1], 'bold', twoMax, 12, midW));
    if (twoSize > nameSize) {
      nameLines = best;
      nameSize = twoSize;
    }
  }
  const groupH = nameLines.length * nameSize * 1.05 + (tagSize ? 4 + tagSize : 0);
  let ty = PAD + (HEADER - groupH) / 2;
  ctx.font = `bold ${nameSize}px ${FONT}`;
  for (const line of nameLines) {
    ctx.fillText(ellipsize(ctx, line, midW), midX, ty);
    ty += nameSize * 1.05;
  }
  if (input.tagline) {
    fitFont(ctx, input.tagline, 'normal', tagSize, 12, midW);
    ctx.fillText(ellipsize(ctx, input.tagline, midW), midX, ty + 4);
  }
  ctx.fillRect(PAD, PAD + HEADER + 4, W - PAD * 2, 2);

  // ── Body: QR code on the right edge, centred in the space under the header.
  // A white gap under the line keeps the QR code's quiet zone, so it scans reliably.
  const bodyTop = PAD + HEADER + 6 + 10;
  const bodyH = H - bodyTop - PAD;
  const qrSize = Math.min(QR, bodyH);
  const qrX = W - PAD - qrSize;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, input.badgeToken, { margin: 0, width: qrSize, errorCorrectionLevel: 'M' });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, qrX, bodyTop + (bodyH - qrSize) / 2, qrSize, qrSize);

  // Name, title, township/company: big, centred left of the QR, vertically centred.
  const textW = qrX - PAD * 2;
  const cx = PAD + textW / 2;
  const place = [townshipLabel(input.township), input.county ? `${input.county} County` : null].filter(Boolean).join(', ') || input.organization || '';
  type Line = { text: string; weight: string; max: number; min: number; gap: number };
  const lines: Line[] = [
    // First and last name on one line, as big as fits.
    { text: `${input.firstName} ${input.lastName}`.trim(), weight: 'bold', max: 52, min: 22, gap: 0 },
    ...(input.title ? [{ text: input.title, weight: 'normal', max: 27, min: 17, gap: 8 }] : []),
    ...(place ? [{ text: place, weight: 'normal', max: 25, min: 16, gap: 2 }] : []),
    ...(extraOrganization(input) ? [{ text: extraOrganization(input)!, weight: 'normal', max: 25, min: 16, gap: 2 }] : []),
  ];
  // Fit each line to the width, then shrink everything together if the block
  // is taller than the space.
  let sized = lines.map((l) => ({ ...l, size: fitFont(ctx, l.text, l.weight, l.max, l.min, textW) }));
  const heightOf = (ls: typeof sized) => ls.reduce((h, l) => h + l.gap + l.size * 1.12, 0);
  let blockH = heightOf(sized);
  if (blockH > bodyH) {
    const k = bodyH / blockH;
    sized = sized.map((l) => ({ ...l, size: Math.floor(l.size * k), gap: Math.floor(l.gap * k) }));
    blockH = heightOf(sized);
  }
  let y = bodyTop + (bodyH - blockH) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const l of sized) {
    y += l.gap;
    ctx.font = `${l.weight} ${l.size}px ${FONT}`;
    ctx.fillText(ellipsize(ctx, l.text, textW), cx, y);
    y += l.size * 1.12;
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
