import type { Metadata, Viewport } from 'next';
import { ScannerClient } from './ScannerClient';

export const metadata: Metadata = {
  title: 'Badge scanner · Township Tools',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B2E5B',
};

// Public, PIN-gated badge scanner for door volunteers. No Township Tools login.
export default function ScanPage({ params }: { params: { courseId: string } }) {
  return (
    <>
      {/* The site-wide dark-mode button would cover the scanner's bottom sheets on phones. */}
      <style>{`button.fixed.bottom-4.right-4.z-50 { display: none !important; }`}</style>
      <ScannerClient courseId={params.courseId} />
    </>
  );
}
