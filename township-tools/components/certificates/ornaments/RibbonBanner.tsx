import * as React from 'react';
import { DEEP, GOLD, NAVY } from '@/lib/certificates/theme';
import { cormorant, cutive } from '@/lib/certificates/fonts';

const FF_BODY = `${cormorant.style.fontFamily}, Georgia, serif`;
const FF_MONO = `${cutive.style.fontFamily}, monospace`;

// Top-of-certificate ribbon banner that holds the "Certificate of Completion"
// title. The ribbon has folded tails on each end that extend past the main
// banner body, and a thin gold pinstripe traces the inside edge.
//
// Text is rendered as positioned HTML on top of the SVG shape so fonts and
// kerning work normally for the html2canvas capture.
type Props = {
  totalWidth: number;
  /** Distance from the certificate's left/right edges to the inside of each tail. */
  edgeInset?: number;
  /** Distance from the tail end to where the main banner begins. */
  tailLength?: number;
  /** Banner main-body height. */
  height?: number;
  /** Position from the top of the certificate. */
  top?: number;
  subtitle: string;
  title: string;
};

export function RibbonBanner({
  totalWidth,
  edgeInset = 90,
  tailLength = 60,
  height = 104,
  top = 36,
  subtitle,
  title,
}: Props) {
  const tailLeftStart = edgeInset;
  const mainLeft = edgeInset + tailLength;
  const mainRight = totalWidth - edgeInset - tailLength;
  const tailRightEnd = totalWidth - edgeInset;
  const mainTop = top;
  const mainBottom = top + height;
  const tailTop = mainTop + 14;
  const tailBottom = mainBottom + 14;
  const notchInset = 18;

  // Left fold strip (underneath, deep navy)
  const leftTail = [
    `M ${tailLeftStart} ${tailTop}`,
    `L ${mainLeft} ${mainTop + 6}`,
    `L ${mainLeft} ${mainBottom - 6}`,
    `L ${tailLeftStart} ${tailBottom}`,
    `L ${tailLeftStart + notchInset} ${(tailTop + tailBottom) / 2}`,
    'Z',
  ].join(' ');

  // Right fold strip (underneath, deep navy)
  const rightTail = [
    `M ${tailRightEnd} ${tailTop}`,
    `L ${mainRight} ${mainTop + 6}`,
    `L ${mainRight} ${mainBottom - 6}`,
    `L ${tailRightEnd} ${tailBottom}`,
    `L ${tailRightEnd - notchInset} ${(tailTop + tailBottom) / 2}`,
    'Z',
  ].join(' ');

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <svg
        width={totalWidth}
        height={tailBottom + 8}
        viewBox={`0 0 ${totalWidth} ${tailBottom + 8}`}
        aria-hidden
      >
        {/* Tails (rendered first so the main banner overlaps them) */}
        <path d={leftTail} fill={DEEP} />
        <path d={rightTail} fill={DEEP} />

        {/* Main banner body */}
        <rect
          x={mainLeft}
          y={mainTop}
          width={mainRight - mainLeft}
          height={height}
          fill={NAVY}
        />

        {/* Inner gold pinstripes top + bottom */}
        <line
          x1={mainLeft + 10}
          y1={mainTop + 9}
          x2={mainRight - 10}
          y2={mainTop + 9}
          stroke={GOLD}
          strokeWidth={0.6}
          opacity={0.8}
        />
        <line
          x1={mainLeft + 10}
          y1={mainBottom - 9}
          x2={mainRight - 10}
          y2={mainBottom - 9}
          stroke={GOLD}
          strokeWidth={0.6}
          opacity={0.8}
        />
      </svg>

      {/* Subtitle + title block. Pixel line-heights (not unitless 1) keep
          html2canvas from inflating the line boxes to the browser default,
          which was opening up a big gap between subtitle and title in the
          PDF render. */}
      <div
        style={{
          position: 'absolute',
          left: mainLeft,
          right: totalWidth - mainRight,
          top: mainTop,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 18,
          gap: 0,
        }}
      >
        <div
          style={{
            // Brighter than the standard GOLD (#B89243) — that mid-tone gold
            // disappears against the navy ribbon at this small size. This
            // luminous champagne reads cleanly on navy without losing the
            // gold/navy palette of the cert.
            color: '#F5D78A',
            fontFamily: FF_MONO,
            fontSize: 12,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            lineHeight: '14px',
            marginBottom: 6,
          }}
        >
          — {subtitle} —
        </div>
        <div
          data-cert-ribbon-title
          style={{
            color: '#FFFFFF',
            fontFamily: FF_BODY,
            fontWeight: 600,
            fontSize: 40,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            lineHeight: '42px',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
