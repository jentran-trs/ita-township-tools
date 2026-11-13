import type { Metadata } from 'next';
import { badgeFont } from '@/lib/badges/fonts';
import { PrintAccessClient } from './PrintAccessClient';

export const metadata: Metadata = {
  title: 'Print badges · Township Tools',
  robots: { index: false, follow: false },
};

// Public, PIN-protected badge printing for whoever prints the badges. Uses the
// same event PIN as the scanner; no Township Tools login.
export default function PrintBadgesPage({ params }: { params: { courseId: string } }) {
  return (
    <div className={badgeFont.variable}>
      <PrintAccessClient courseId={params.courseId} />
    </div>
  );
}
