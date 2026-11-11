// Walk-in label for the NIIMBOT B31 (75 x 50 mm, black thermal, 203 dpi).
// Drawn on a canvas in the browser at the printer's native resolution
// (8 px/mm → 600 x 400) and saved as a PNG; Jen prints it from the NIIMBOT
// phone app (the printer can't be driven from a website).
import QRCode from 'qrcode';
import { townshipLabel } from '@/lib/certificates/township';

export type LabelInput = {
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  badgeToken: string;
  eventName: string;
};

const PX_PER_MM = 8;
const W = 75 * PX_PER_MM;
const H = 50 * PX_PER_MM;
const PAD = 3 * PX_PER_MM;
const QR = 34 * PX_PER_MM;
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
  ctx.textBaseline = 'alphabetic';

  // QR code on the right, vertically centred.
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, input.badgeToken, { margin: 0, width: QR, errorCorrectionLevel: 'M' });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, W - PAD - QR, (H - QR) / 2, QR, QR);

  const textW = W - PAD * 3 - QR;
  let y = PAD;

  const first = fitFont(ctx, input.firstName, 'bold', 64, 28, textW);
  y += first;
  ctx.fillText(ellipsize(ctx, input.firstName, textW), PAD, y);

  const last = fitFont(ctx, input.lastName, 'bold', 40, 22, textW);
  y += last + 4;
  ctx.fillText(ellipsize(ctx, input.lastName, textW), PAD, y);

  ctx.font = `24px ${FONT}`;
  if (input.title) {
    y += 34;
    ctx.fillText(ellipsize(ctx, input.title, textW), PAD, y);
  }
  const twp = townshipLabel(input.township);
  if (twp) {
    y += 30;
    ctx.fillText(ellipsize(ctx, twp, textW), PAD, y);
  }
  if (input.county) {
    y += 30;
    ctx.fillText(ellipsize(ctx, `${input.county} County`, textW), PAD, y);
  }

  // Event name along the bottom in small type.
  ctx.font = `18px ${FONT}`;
  ctx.fillText(ellipsize(ctx, input.eventName, textW), PAD, H - PAD);

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
