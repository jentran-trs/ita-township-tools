import type { Metadata, Viewport } from 'next';
import { FindBadgeClient } from './FindBadgeClient';

export const metadata: Metadata = {
  title: 'Find my badge number',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1B2E5B',
};

// Self-serve screen at check-in (touchscreen tablet): attendees type their last
// name to see their badge number. Unlocked once with the event PIN by staff.
// Shows nothing else and records nothing; badges are still scanned at the table.
export default function FindBadgePage({ params }: { params: { courseId: string } }) {
  return (
    <>
      {/* No site-wide dark-mode button on a public kiosk screen. */}
      <style>{`button.fixed.bottom-4.right-4.z-50 { display: none !important; }`}</style>
      <FindBadgeClient courseId={params.courseId} />
    </>
  );
}
