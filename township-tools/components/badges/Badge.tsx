import { GOLD, NAVY } from '@/lib/certificates/theme';
import { townshipLabel } from '@/lib/certificates/township';
import { badgeTypeStyle } from '@/lib/badges/badge-type';

// Printable name badges, sized in real inches so the browser prints them at
// exactly that size (print at 100% / Actual size). The QR code goes on the
// BACK; the front is for people to read.
//
// Formats:
//   '5390' — 3.5" x 2.25" horizontal (Avery 5390, 8 per sheet). Default.
//   '5392' — 3" x 4" vertical (Avery 5392, 6 per sheet).

export type BadgeFormat = '5390' | '5392';

export type BadgeData = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  township: string | null;
  county: string | null;
  registrantType: string | null;
  organization?: string | null;
  qrSvg: string; // SVG markup for the badge_token QR code
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

function place(b: BadgeData) {
  const twp = [townshipLabel(b.township), b.county ? `${b.county} County` : null].filter(Boolean).join(' · ');
  return twp || b.organization || '';
}

function fullNameSize(name: string, format: BadgeFormat): string {
  const n = name.length;
  if (format === '5390') return n <= 16 ? '21pt' : n <= 20 ? '18pt' : n <= 25 ? '15pt' : '12.5pt';
  return n <= 14 ? '24pt' : n <= 19 ? '20pt' : n <= 24 ? '17pt' : '14pt';
}

function eventNameSize(name: string): string {
  return name.length <= 28 ? '9.5pt' : name.length <= 42 ? '8pt' : '7pt';
}

function TypeBar({ type, height }: { type: string | null; height: string }) {
  const t = badgeTypeStyle(type);
  return (
    <div
      style={{
        height,
        borderRadius: '0.05in',
        background: t.bg,
        color: t.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8.5pt',
        fontWeight: 800,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      {t.label}
    </div>
  );
}

function EventHeader({ event, logoSize, center }: { event: BadgeEvent; logoSize: string; center?: boolean }) {
  const when = [event.dates, event.times].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.09in', flexDirection: center ? 'column' : 'row', textAlign: center ? 'center' : 'left' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={event.logoUrl} alt="ITA" style={{ height: logoSize, width: logoSize, objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ minWidth: 0, lineHeight: 1.18 }}>
        <div
          style={{
            fontSize: eventNameSize(event.name),
            fontWeight: 800,
            color: NAVY,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            maxHeight: '2.4em',
            overflow: 'hidden',
          }}
        >
          {event.name}
        </div>
        {event.tagline && (
          <div style={{ fontSize: '7.5pt', fontWeight: 700, color: GOLD, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.tagline}
          </div>
        )}
        {when && <div style={{ fontSize: '6.5pt', fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' }}>{when}</div>}
      </div>
    </div>
  );
}

const rule = (margin: string) => <div style={{ height: '1.5px', background: GOLD, margin }} />;

export function BadgeFront({ badge, event, format = '5390' }: { badge: BadgeData; event: BadgeEvent; format?: BadgeFormat }) {
  const name = `${badge.firstName} ${badge.lastName}`;
  if (format === '5390') {
    return (
      <div style={{ width: '3.5in', height: '2.25in', boxSizing: 'border-box', padding: '0.13in 0.17in 0.13in', display: 'flex', flexDirection: 'column', fontFamily: FONT, color: NAVY, background: '#fff', overflow: 'hidden' }}>
        <EventHeader event={event} logoSize="0.5in" />
        {rule('0.07in 0 0.06in')}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
          <div style={{ fontSize: fullNameSize(name, format), fontWeight: 800, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {place(badge) && <div style={{ fontSize: '8pt', fontWeight: 700, marginTop: '0.03in', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place(badge)}</div>}
          {badge.title && <div style={{ fontSize: '7.5pt', fontWeight: 600, color: MUTED, marginTop: '0.01in', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{badge.title}</div>}
        </div>
        <TypeBar type={badge.registrantType} height="0.21in" />
      </div>
    );
  }
  return (
    <div style={{ width: '3in', height: '4in', boxSizing: 'border-box', padding: '0.18in 0.18in 0.16in', display: 'flex', flexDirection: 'column', fontFamily: FONT, color: NAVY, background: '#fff', overflow: 'hidden', textAlign: 'center' }}>
      <EventHeader event={event} logoSize="0.62in" center />
      {rule('0.1in 0.4in 0.08in')}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: fullNameSize(badge.firstName, format), fontWeight: 800, lineHeight: 1.05, wordBreak: 'break-word' }}>{badge.firstName}</div>
        <div style={{ fontSize: '15pt', fontWeight: 800, lineHeight: 1.1, wordBreak: 'break-word' }}>{badge.lastName}</div>
        {place(badge) && <div style={{ fontSize: '8.5pt', fontWeight: 700, marginTop: '0.06in' }}>{place(badge)}</div>}
        {badge.title && <div style={{ fontSize: '8.5pt', fontWeight: 600, color: MUTED, marginTop: '0.02in' }}>{badge.title}</div>}
      </div>
      <TypeBar type={badge.registrantType} height="0.26in" />
    </div>
  );
}

export function BadgeBack({ badge, format = '5390' }: { badge: BadgeData; format?: BadgeFormat }) {
  const qr = (size: string) => <div style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: badge.qrSvg }} />;
  const caption = <div style={{ fontSize: '6.5pt', fontWeight: 600, color: MUTED, marginTop: '0.06in' }}>Scan to check in &amp; out</div>;
  if (format === '5390') {
    return (
      <div style={{ width: '3.5in', height: '2.25in', boxSizing: 'border-box', padding: '0.2in', display: 'flex', alignItems: 'center', gap: '0.18in', fontFamily: FONT, color: NAVY, background: '#fff', overflow: 'hidden' }}>
        {qr('1.6in')}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: badge.firstName.length <= 9 ? '22pt' : '16pt', fontWeight: 800, lineHeight: 1.05, wordBreak: 'break-word' }}>{badge.firstName}</div>
          <div style={{ fontSize: badge.lastName.length <= 12 ? '14pt' : '11pt', fontWeight: 800, lineHeight: 1.1, wordBreak: 'break-word' }}>{badge.lastName}</div>
          {caption}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: '3in', height: '4in', boxSizing: 'border-box', padding: '0.3in 0.2in', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, color: NAVY, background: '#fff', overflow: 'hidden' }}>
      {qr('1.9in')}
      <div style={{ fontSize: badge.firstName.length <= 10 ? '24pt' : '18pt', fontWeight: 800, lineHeight: 1.05, marginTop: '0.18in', wordBreak: 'break-word' }}>{badge.firstName}</div>
      <div style={{ fontSize: '15pt', fontWeight: 800, lineHeight: 1.1, wordBreak: 'break-word' }}>{badge.lastName}</div>
      {caption}
    </div>
  );
}
