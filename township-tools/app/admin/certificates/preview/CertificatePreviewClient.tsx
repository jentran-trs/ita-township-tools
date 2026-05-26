"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import QRCode from 'qrcode';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { CERT_HEIGHT, CERT_WIDTH } from '@/lib/certificates/theme';
import type { CertificateData, CertificateSignature } from '@/components/certificates/Certificate';
import { buildVerifyUrl } from '@/lib/certificates/verify-url';
import { SBOA_UPLOAD_URL } from '@/lib/certificates/sboa';

const Certificate = dynamic(
  () => import('@/components/certificates/Certificate').then((m) => m.Certificate),
  { ssr: false }
);

const SAMPLE_SIGNATURES: CertificateSignature[] = [
  { signer_name: 'John Wales', signer_title: 'Executive Director', signature_image_url: null },
];

const SAMPLE_BASE: Omit<CertificateData, 'signatures'> = {
  recipient: {
    first: 'Jen',
    last: 'Tran',
    township: 'Vernon Township',
    county: 'Hancock',
  },
  course: {
    name: '2026 Township Assistance Training',
    hours: 5,
    method: 'in_person',
    course_date: '2026-04-22',
    course_id: 'ITA-2026_100',
  },
  credential_id: 'ITA-2026_100-A3F9K2',
  org_name: 'Indiana Township Association',
  logo_url: '/certificates/ita-logo.png',
};

export function CertificatePreviewClient() {
  const router = useRouter();
  const [showLocation, setShowLocation] = useState(true);
  const [longName, setLongName] = useState(false);
  const [longCourseName, setLongCourseName] = useState(false);
  const [zoom, setZoom] = useState<number>(0.7);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sboaQrDataUrl, setSboaQrDataUrl] = useState<string | null>(null);

  const verifyUrl = useMemo(
    () => buildVerifyUrl(SAMPLE_BASE.credential_id),
    []
  );

  const data: CertificateData = useMemo(() => {
    const recipient = {
      ...SAMPLE_BASE.recipient,
      first: longName ? 'Maximilian Bartholomew' : SAMPLE_BASE.recipient.first,
      last: longName ? 'Featherstonehaugh' : SAMPLE_BASE.recipient.last,
      township: showLocation ? SAMPLE_BASE.recipient.township : null,
      county: showLocation ? SAMPLE_BASE.recipient.county : null,
    };
    const course = {
      ...SAMPLE_BASE.course,
      name: longCourseName
        ? 'Indiana Statutory Township Officials Continuing Education and Certification Workshop'
        : SAMPLE_BASE.course.name,
    };
    return {
      ...SAMPLE_BASE,
      recipient,
      course,
      signatures: SAMPLE_SIGNATURES,
      qrDataUrl,
      sboaQrDataUrl,
      verifyUrl,
    };
  }, [showLocation, longName, longCourseName, qrDataUrl, sboaQrDataUrl, verifyUrl]);

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

  // Auto-fit zoom based on viewport width
  useEffect(() => {
    const fit = () => {
      const padding = 64;
      const available = window.innerWidth - padding;
      const z = Math.min(1, available / CERT_WIDTH);
      setZoom(Math.max(0.4, z));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/certificates')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-xl font-bold">Certificate Preview</h1>
          </div>
          <div className="text-sm text-gray-500">Superadmin · visual sandbox</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Controls */}
          <aside className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Toggles
            </h2>

            <div className="space-y-4">
              <ToggleRow
                label="Show location (township + county)"
                checked={showLocation}
                onChange={setShowLocation}
              />
              <ToggleRow
                label="Test long recipient name"
                checked={longName}
                onChange={setLongName}
              />
              <ToggleRow
                label="Test long course name"
                checked={longCourseName}
                onChange={setLongCourseName}
              />

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Zoom <span className="text-gray-500 text-xs">({Math.round(zoom * 100)}%)</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(parseInt(e.target.value, 10) / 100)}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowLocation(true);
                setLongName(false);
                setLongCourseName(false);
              }}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>

            <p className="mt-5 text-xs text-gray-500 leading-relaxed">
              This page renders the certificate template with sample data. Verify the layout looks right
              here before wiring it into the public download flow.
            </p>
          </aside>

          {/* Preview canvas */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 overflow-hidden">
            <div
              style={{
                width: '100%',
                height: CERT_HEIGHT * zoom + 32,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  width: CERT_WIDTH,
                  height: CERT_HEIGHT,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
                }}
              >
                <Certificate data={data} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
