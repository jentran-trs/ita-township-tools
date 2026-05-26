"use client";

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Certificate, type CertificateData } from './Certificate';
import { CERT_HEIGHT, CERT_WIDTH } from '@/lib/certificates/theme';
import { SBOA_UPLOAD_URL } from '@/lib/certificates/sboa';

type Props = {
  data: Omit<CertificateData, 'qrDataUrl'>;
  verifyUrl: string;
  filename?: string;
  onDownloaded?: () => void;
  className?: string;
  label?: string;
};

function defaultFilename(data: Props['data']) {
  const last = (data.recipient.last || data.recipient.first || 'certificate').replace(/[^a-zA-Z0-9]+/g, '');
  return `ITA-Certificate-${last}-${data.credential_id}.pdf`;
}

export function CertificateDownloadButton({
  data,
  verifyUrl,
  filename,
  onDownloaded,
  className,
  label = 'Download PDF',
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sboaQrDataUrl, setSboaQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-generate the verify QR code once we have a verify URL.
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#11204A', light: '#00000000' },
      width: 240,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  // Pre-generate the SBOA QR code (constant URL, generated once).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(SBOA_UPLOAD_URL, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#11204A', light: '#FFFFFF' },
      width: 200,
    })
      .then((url) => {
        if (!cancelled) setSboaQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onDownload = async () => {
    setError(null);
    setBusy(true);
    try {
      const node = certRef.current;
      if (!node) throw new Error('Certificate not ready');

      // Force every font/size combination used inside the cert to load
      // before capture. Bounded by a timeout so a stuck font.load() can't
      // freeze the download forever.
      await withTimeout(preloadFonts(node), 4000);
      // Pre-warm <img> URLs, <img> load state, AND background-image URLs in
      // parallel so html2canvas reads them from cache instead of fetching
      // mid-capture. The new Image() preload uses crossOrigin: anonymous so
      // the resulting cache entries are usable by html2canvas without
      // tainting the canvas.
      await withTimeout(
        Promise.all([
          waitForImages(node),
          preloadBackgroundImages(node),
          preloadImgElementUrls(node),
        ]),
        5000
      );
      // Let the browser repaint with the now-loaded fonts before capture.
      await new Promise<void>((res) =>
        requestAnimationFrame(() => requestAnimationFrame(() => res()))
      );

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // DOM-prep: compensate for html2canvas rendering quirks right before
      // capture. Each block records the original style so it can be reset
      // in the finally below.
      const pills = Array.from(node.querySelectorAll<HTMLElement>('[data-cert-pill]'));
      const pillRestore = pills.map((el) => {
        const orig = el.style.paddingBottom;
        const h = el.offsetHeight;
        el.style.paddingBottom = `${Math.round(h * 0.35)}px`;
        return () => {
          el.style.paddingBottom = orig;
        };
      });

      const ribbonTitles = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-ribbon-title]')
      );
      const ribbonRestore = ribbonTitles.map((el) => {
        const orig = el.style.marginTop;
        el.style.marginTop = '-12px';
        return () => {
          el.style.marginTop = orig;
        };
      });

      const courseNames = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-course-name]')
      );
      const courseNameRestore = courseNames.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-10px)';
        return () => {
          el.style.transform = orig;
        };
      });

      const upperBlocks = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-upper-block]')
      );
      const upperBlockRestore = upperBlocks.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-46px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // Presentation line lifts in parallel with the upper block so the
      // entire "presented to → IC certification line" group reads as one
      // cohesive block higher up on the PDF.
      const presentations = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-presentation]')
      );
      const presentationRestore = presentations.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-20px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // Signature row sits too low in the PDF render — translate it up so
      // the signatures (and any org line beneath them) sit higher on the
      // cert with comfortable space above the bottom border.
      const sigRows = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-signature-row]')
      );
      const sigRowRestore = sigRows.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-30px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // Name underline lands a few pixels too high in PDF — nudge it down
      // so it sits cleanly under the script name.
      const nameUnderlines = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-name-underline]')
      );
      const nameUnderlineRestore = nameUnderlines.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(8px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // SBOA disclosure text sits a bit too close to the QR in PDF — lift
      // it up so the gap above the QR matches what the preview shows.
      const sboaTexts = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-sboa-text]')
      );
      const sboaTextRestore = sboaTexts.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-10px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // "Verify at:" caption renders too close to the QR seal in the PDF
      // — nudge it up so it clears the seal's circular border.
      const verifyLabels = Array.from(
        node.querySelectorAll<HTMLElement>('[data-cert-verify-label]')
      );
      const verifyLabelRestore = verifyLabels.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-8px)';
        return () => {
          el.style.transform = orig;
        };
      });

      // Bottom-anchored blocks (logo, SBOA, verify QR) shift up together in
      // PDF so they sit higher on the cert. The signature block stays put
      // since it's already in the right spot.
      const bottomBlocks = Array.from(
        node.querySelectorAll<HTMLElement>(
          '[data-cert-logo-block], [data-cert-sboa-block], [data-cert-verify-block]'
        )
      );
      const bottomBlockRestore = bottomBlocks.map((el) => {
        const orig = el.style.transform;
        el.style.transform = 'translateY(-30px)';
        return () => {
          el.style.transform = orig;
        };
      });

      const sigImgRestore: Array<() => void> = [];
      const signerTitleRestore: Array<() => void> = [];

      let canvas;
      try {
        canvas = await html2canvas(node, {
          // 1.5 (instead of 2) cuts canvas pixel count by ~44% and is the
          // single biggest lever for download speed. Output is still
          // ~150 DPI on the printed PDF — visually crisp on screen and
          // adequate for print.
          scale: 1.5,
          useCORS: true,
          backgroundColor: null,
          windowWidth: CERT_WIDTH,
          windowHeight: CERT_HEIGHT,
          logging: false,
        });
      } finally {
        pillRestore.forEach((restore) => restore());
        ribbonRestore.forEach((restore) => restore());
        courseNameRestore.forEach((restore) => restore());
        upperBlockRestore.forEach((restore) => restore());
        signerTitleRestore.forEach((restore) => restore());
        sigImgRestore.forEach((restore) => restore());
        sigRowRestore.forEach((restore) => restore());
        nameUnderlineRestore.forEach((restore) => restore());
        sboaTextRestore.forEach((restore) => restore());
        verifyLabelRestore.forEach((restore) => restore());
        presentationRestore.forEach((restore) => restore());
        bottomBlockRestore.forEach((restore) => restore());
      }
      // JPEG at 0.95 is visually indistinguishable from PNG at this
      // resolution and encodes ~10× faster, which dominates the perceived
      // download time. (Same pattern the Report Builder uses.)
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [11, 8.5],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5, undefined, 'FAST');
      pdf.save(filename || defaultFilename(data));

      if (onDownloaded) onDownloaded();
    } catch (e: any) {
      setError(e.message || 'Could not generate PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className={
          className ||
          'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60'
        }
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? 'Preparing PDF…' : label}
      </button>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

      {/* Off-screen render stage at native resolution. html2canvas captures
          from here so the on-page card layout doesn't interfere. */}
      <div
        ref={stageRef}
        aria-hidden
        style={{
          position: 'fixed',
          left: -99999,
          top: 0,
          width: CERT_WIDTH,
          height: CERT_HEIGHT,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <div ref={certRef}>
          <Certificate
            data={{ ...data, qrDataUrl, sboaQrDataUrl, verifyUrl }}
          />
        </div>
      </div>
    </>
  );
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((res) => {
        // Per-image safety timeout. A misconfigured CORS or a dropped image
        // request must not stall the whole capture.
        const safety = setTimeout(() => res(), 3500);
        const done = () => {
          clearTimeout(safety);
          res();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    })
  );
}

// Promise that resolves either when `p` finishes or after `ms` — whichever
// comes first. The latter case fires nothing else: the caller treats the
// timeout as "good enough, proceed".
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    p,
    new Promise<undefined>((res) => setTimeout(() => res(undefined), ms)),
  ]);
}

// Pre-fetch every <img> URL via a fresh Image() with crossOrigin set, so
// html2canvas finds a CORS-clean copy in the browser cache when it walks
// the DOM. Necessary because the on-page <img> can finish loading WITHOUT
// CORS (e.g. cached from a previous bg-image fetch), which then taints the
// canvas and makes the image render blank in the PDF.
async function preloadImgElementUrls(root: HTMLElement) {
  const urls = new Set<string>();
  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.src) urls.add(img.src);
  });
  if (urls.size === 0) return;
  await Promise.all(
    Array.from(urls).map(
      (url) =>
        new Promise<void>((res) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const safety = setTimeout(() => res(), 4000);
          img.onload = () => {
            clearTimeout(safety);
            res();
          };
          img.onerror = () => {
            clearTimeout(safety);
            res();
          };
          img.src = url;
        })
    )
  );
}

// Fetch every distinct background-image URL inside the cert so the browser
// has them cached before html2canvas runs. html2canvas does its own image
// fetching for background-image properties, and any uncached fetch adds
// latency to the capture.
async function preloadBackgroundImages(root: HTMLElement) {
  const urls = new Set<string>();
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  for (const el of elements) {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') continue;
    const match = bg.match(/url\((['"]?)(.+?)\1\)/);
    if (match && match[2]) urls.add(match[2]);
  }
  if (urls.size === 0) return;
  await Promise.all(
    Array.from(urls).map(
      (url) =>
        new Promise<void>((res) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res();
          img.onerror = () => res();
          img.src = url;
        })
    )
  );
}

// Walk the cert DOM, collect every (style/weight/size/family) tuple that's
// actually in use, and ask the FontFace API to load each one. Avoids the
// race where html2canvas captures before a custom font has finished
// downloading and silently falls back to a system font.
async function preloadFonts(root: HTMLElement) {
  const fontsApi = (document as any).fonts;
  if (!fontsApi || typeof fontsApi.load !== 'function') return;

  const specs = new Set<string>();
  const collect = (el: Element) => {
    const cs = window.getComputedStyle(el);
    if (!cs.fontFamily) return;
    const spec = `${cs.fontStyle || 'normal'} ${cs.fontWeight || '400'} ${cs.fontSize || '16px'} ${cs.fontFamily}`;
    specs.add(spec);
  };

  collect(root);
  root.querySelectorAll<HTMLElement>('*').forEach(collect);

  await Promise.all(
    Array.from(specs).map((spec) =>
      fontsApi.load(spec).catch(() => null)
    )
  );
  // Final safety: wait for any other in-flight loads.
  if (fontsApi.ready) await fontsApi.ready;
}
