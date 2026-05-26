import * as React from 'react';
import { GOLD, NAVY, DEEP } from '@/lib/certificates/theme';
import { cutive } from '@/lib/certificates/fonts';

const FF_MONO = `${cutive.style.fontFamily}, monospace`;

type Props = {
  size?: number;
  qrDataUrl?: string | null;
};

export function VerifySeal({ size = 92, qrDataUrl }: Props) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const arcId = `verify-arc-${id}`;
  const r = size / 2;
  const ringInner = r - 4;
  const ringOuter = r - 1;
  const qrPad = Math.round(size * 0.18);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden
    >
      <defs>
        <path
          id={arcId}
          d={`M ${r} ${r} m -${ringInner - 3} 0 a ${ringInner - 3} ${ringInner - 3} 0 1 1 ${(ringInner - 3) * 2} 0 a ${ringInner - 3} ${ringInner - 3} 0 1 1 -${(ringInner - 3) * 2} 0`}
          fill="none"
        />
      </defs>

      {/* Outer ring */}
      <circle cx={r} cy={r} r={ringOuter} fill="none" stroke={GOLD} strokeWidth={1.4} />
      <circle cx={r} cy={r} r={ringInner} fill="none" stroke={NAVY} strokeWidth={0.8} opacity={0.7} />

      {/* Tick marks around outer ring */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const x1 = r + Math.cos(angle) * (ringInner + 1);
        const y1 = r + Math.sin(angle) * (ringInner + 1);
        const x2 = r + Math.cos(angle) * (ringOuter - 0.5);
        const y2 = r + Math.sin(angle) * (ringOuter - 0.5);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={GOLD}
            strokeWidth={0.6}
            opacity={0.8}
          />
        );
      })}

      {/* Curved rim text */}
      <text
        fill={NAVY}
        style={{
          fontFamily: FF_MONO,
          fontSize: 7,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        <textPath href={`#${arcId}`} startOffset="0%">
          Verify · Scan · Authentic · Verify · Scan ·
        </textPath>
      </text>

      {/* QR code in center */}
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <image
          href={qrDataUrl}
          x={qrPad}
          y={qrPad}
          width={size - qrPad * 2}
          height={size - qrPad * 2}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <g>
          <rect
            x={qrPad}
            y={qrPad}
            width={size - qrPad * 2}
            height={size - qrPad * 2}
            fill={DEEP}
            opacity={0.08}
          />
          <text
            x={r}
            y={r + 3}
            textAnchor="middle"
            fill={NAVY}
            style={{
              fontFamily: FF_MONO,
              fontSize: 8,
              letterSpacing: '0.1em',
            }}
          >
            QR
          </text>
        </g>
      )}
    </svg>
  );
}
