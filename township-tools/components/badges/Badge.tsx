import { GOLD, NAVY } from '@/lib/certificates/theme';
import { townshipLabel } from '@/lib/certificates/township';
import { badgeTypeStyle } from '@/lib/badges/badge-type';

// Printable 3.5" x 2.25" horizontal name badge (Avery 5390, 8 per sheet),
// sized in real inches so the browser prints it at exactly that size (print
// at 100% / Actual size). Names are for people to read on the front; the QR
// code for check-in goes on the BACK.

export type BadgeData = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  registrantType: string | null;
  organization?: string | null;
  qrSrc: string; // PNG data URL of the badge_token QR code
};

export type BadgeEvent = {
  name: string;
  tagline: string | null;
  dates: string; // "December 9–10, 2026"
  times: string | null; // "9:00 AM – 4:00 PM"
  logoUrl: string;
};

const FONT = 'var(--font-badge), Arial, Helvetica, sans-serif';
const MUTED = '#4b5563';

/** Township · County, or the company for sponsors and vendors. */
function place(b: BadgeData) {
  const twp = [townshipLabel(b.township), b.county ? `${b.county} County` : null].filter(Boolean).join(' · ');
  return twp || b.organization || '';
}

// Sizes chosen so the longest realistic text still fits the 3.16" line.
function nameSize(name: string): string {
  const n = name.length;
  return n <= 14 ? '26pt' : n <= 18 ? '22pt' : n <= 23 ? '18pt' : n <= 28 ? '15pt' : '13pt';
}
function lineSize(text: string, big: number): string {
  const n = text.length;
  return n <= 34 ? `${big}pt` : n <= 44 ? `${big - 1.5}pt` : `${big - 2.5}pt`;
}
function eventNameSize(name: string): string {
  return name.length <= 28 ? '9.5pt' : name.length <= 42 ? '8pt' : '7pt';
}

const oneLine = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export function BadgeFront({ badge, event }: { badge: BadgeData; event: BadgeEvent }) {
  const name = `${badge.firstName} ${badge.lastName}`;
  const where = place(badge);
  const when = [event.dates, event.times].filter(Boolean).join(' · ');
  const type = badgeTypeStyle(badge.registrantType);

  return (
    <div
      style={{
        width: '3.5in',
        height: '2.25in',
        boxSizing: 'border-box',
        padding: '0.12in 0.17in 0.12in',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
        color: NAVY,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Event header: logo + event name, tagline, date and time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.09in' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={event.logoUrl} alt="ITA" style={{ height: '0.48in', width: '0.48in', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ minWidth: 0, lineHeight: 1.18 }}>
          <div style={{ fontSize: eventNameSize(event.name), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', maxHeight: '2.4em', overflow: 'hidden' }}>
            {event.name}
          </div>
          {event.tagline && <div style={{ fontSize: '7.5pt', fontWeight: 700, color: GOLD, ...oneLine }}>{event.tagline}</div>}
          {when && <div style={{ fontSize: '6.5pt', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' }}>{when}</div>}
        </div>
      </div>

      <div style={{ height: '1.5px', background: GOLD, margin: '0.06in 0 0.04in' }} />

      {/* Name, organization, title — big and centred */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: nameSize(name), fontWeight: 800, lineHeight: 1.05, maxWidth: '100%', ...oneLine }}>{name}</div>
        {where && (
          <div style={{ fontSize: lineSize(where, 11), fontWeight: 700, marginTop: '0.04in', lineHeight: 1.15, maxWidth: '100%', ...oneLine }}>{where}</div>
        )}
        {badge.title && (
          <div style={{ fontSize: lineSize(badge.title, 10), fontWeight: 600, color: MUTED, marginTop: '0.01in', lineHeight: 1.15, maxWidth: '100%', ...oneLine }}>
            {badge.title}
          </div>
        )}
      </div>

      {/* Registrant type bar */}
      <div
        style={{
          height: '0.21in',
          marginTop: '0.04in',
          borderRadius: '0.05in',
          background: type.bg,
          color: type.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8.5pt',
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {type.label}
      </div>
    </div>
  );
}

export function BadgeBack({ badge }: { badge: BadgeData }) {
  return (
    <div style={{ width: '3.5in', height: '2.25in', boxSizing: 'border-box', padding: '0.2in', display: 'flex', alignItems: 'center', gap: '0.18in', fontFamily: FONT, color: NAVY, background: '#fff', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badge.qrSrc} alt="" style={{ width: '1.6in', height: '1.6in', flexShrink: 0, imageRendering: 'pixelated' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: badge.firstName.length <= 9 ? '22pt' : '16pt', fontWeight: 800, lineHeight: 1.05, wordBreak: 'break-word' }}>{badge.firstName}</div>
        <div style={{ fontSize: badge.lastName.length <= 12 ? '14pt' : '11pt', fontWeight: 800, lineHeight: 1.1, wordBreak: 'break-word' }}>{badge.lastName}</div>
        <div style={{ fontSize: '6.5pt', fontWeight: 600, color: MUTED, marginTop: '0.06in' }}>Scan to check in &amp; out</div>
      </div>
    </div>
  );
}
