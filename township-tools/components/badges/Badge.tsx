import { GOLD, NAVY } from '@/lib/certificates/theme';
import { townshipLabel } from '@/lib/certificates/township';

// One 3" wide x 4" tall vertical name badge. Sized in real inches so the
// browser prints it at exactly that size (print at 100% / Actual size).
// Plain system fonts so every office printer renders it the same way.

export type BadgeData = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  qrSvg: string; // SVG markup for the badge_token QR code
};

export type BadgeEvent = {
  name: string;
  dates: string; // "November 12, 2026" or "November 12–13, 2026"
  times: string | null; // "9:00 AM – 4:00 PM"
  logoUrl: string;
};

function firstNameSize(name: string): string {
  const n = name.length;
  if (n <= 8) return '30pt';
  if (n <= 11) return '25pt';
  if (n <= 14) return '20pt';
  return '16pt';
}

function lastNameSize(name: string): string {
  const n = name.length;
  if (n <= 12) return '16pt';
  if (n <= 18) return '13pt';
  return '11pt';
}

export function Badge({ badge, event }: { badge: BadgeData; event: BadgeEvent }) {
  const place = [townshipLabel(badge.township), badge.county ? `${badge.county} County` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      style={{
        width: '3in',
        height: '4in',
        boxSizing: 'border-box',
        padding: '0.16in 0.18in 0.14in',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#1f2937',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={event.logoUrl} alt="Indiana Township Association" style={{ height: '0.58in', width: 'auto' }} />

      <div
        style={{
          marginTop: '0.06in',
          fontSize: '9.5pt',
          fontWeight: 700,
          color: NAVY,
          lineHeight: 1.15,
          maxHeight: '2.3em',
          overflow: 'hidden',
        }}
      >
        {event.name}
      </div>
      <div style={{ fontSize: '8pt', color: '#4b5563', marginTop: '0.02in', lineHeight: 1.2 }}>
        {event.dates}
        {event.times ? <><br />{event.times}</> : null}
      </div>

      <div style={{ width: '1.4in', height: '2px', background: GOLD, margin: '0.07in 0 0.06in' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
        <div style={{ fontSize: firstNameSize(badge.firstName), fontWeight: 700, color: NAVY, lineHeight: 1.05, wordBreak: 'break-word' }}>
          {badge.firstName}
        </div>
        <div style={{ fontSize: lastNameSize(badge.lastName), fontWeight: 700, color: NAVY, lineHeight: 1.1, wordBreak: 'break-word' }}>
          {badge.lastName}
        </div>
        {badge.title && (
          <div style={{ fontSize: '9.5pt', marginTop: '0.05in', lineHeight: 1.15 }}>{badge.title}</div>
        )}
        {place && <div style={{ fontSize: '8.5pt', color: '#4b5563', marginTop: '0.02in', lineHeight: 1.15 }}>{place}</div>}
      </div>

      <div
        style={{ width: '0.95in', height: '0.95in', marginTop: '0.04in' }}
        // Generated server-side by the qrcode library from the badge token.
        dangerouslySetInnerHTML={{ __html: badge.qrSvg }}
      />
    </div>
  );
}
