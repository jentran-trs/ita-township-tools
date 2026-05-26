import * as React from 'react';
import { DEEP, GOLD, NAVY } from '@/lib/certificates/theme';

// Layered ornate border in the style of an engraved diploma:
//   ┌─ outermost navy hairline
//   ├─ thick navy band (~32px) filled with a fine cross-hatch weave
//   ├─ gold pinstripes along both edges of the band
//   ├─ four decorative diamond rosettes — one inside each corner of the band
//   └─ inner gold rule defining the content area
type Props = {
  width: number;
  height: number;
};

export function GuillocheBorder({ width, height }: Props) {
  // Offsets from the certificate edge (px)
  const A = 8; // outer navy hairline
  const B = 12; // outer edge of navy band
  const C = 44; // inner edge of navy band (32px-wide band)
  const D = 52; // inner gold rule
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const hatchId = `hatch-${id}`;

  // Centers of the four corner rosettes (inside the band)
  const rosetteOffset = 22; // distance from the cert corner to the rosette center
  const rosettes = [
    [rosetteOffset + B, rosetteOffset + B],
    [width - rosetteOffset - B, rosetteOffset + B],
    [rosetteOffset + B, height - rosetteOffset - B],
    [width - rosetteOffset - B, height - rosetteOffset - B],
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <defs>
        <pattern id={hatchId} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={NAVY} />
          {/* Tight cross-hatch — denser than the previous version */}
          <line x1="0" y1="0" x2="4" y2="4" stroke={DEEP} strokeWidth={0.65} opacity={0.65} />
          <line x1="4" y1="0" x2="0" y2="4" stroke={DEEP} strokeWidth={0.65} opacity={0.65} />
          {/* Tiny gold flecks scattered through the weave */}
          <circle cx="2" cy="2" r="0.35" fill={GOLD} opacity={0.55} />
        </pattern>
      </defs>

      {/* Outermost thin navy hairline */}
      <rect
        x={A}
        y={A}
        width={width - A * 2}
        height={height - A * 2}
        fill="none"
        stroke={NAVY}
        strokeWidth={0.8}
        opacity={0.7}
      />

      {/* Thick navy band via even-odd fill */}
      <path
        d={`M ${B} ${B} L ${width - B} ${B} L ${width - B} ${height - B} L ${B} ${height - B} Z M ${C} ${C} L ${C} ${height - C} L ${width - C} ${height - C} L ${width - C} ${C} Z`}
        fill={`url(#${hatchId})`}
        fillRule="evenodd"
      />

      {/* Gold pinstripe along the band's outer edge */}
      <rect
        x={B + 1.5}
        y={B + 1.5}
        width={width - (B + 1.5) * 2}
        height={height - (B + 1.5) * 2}
        fill="none"
        stroke={GOLD}
        strokeWidth={0.7}
        opacity={0.8}
      />

      {/* Gold pinstripe along the band's inner edge */}
      <rect
        x={C - 1.5}
        y={C - 1.5}
        width={width - (C - 1.5) * 2}
        height={height - (C - 1.5) * 2}
        fill="none"
        stroke={GOLD}
        strokeWidth={0.9}
        opacity={0.9}
      />

      {/* Decorative rosettes — concentric rotated squares with a center dot */}
      {rosettes.map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <g transform="rotate(45)">
            <rect
              x={-11}
              y={-11}
              width={22}
              height={22}
              fill="none"
              stroke={GOLD}
              strokeWidth={0.9}
              opacity={0.95}
            />
            <rect
              x={-7}
              y={-7}
              width={14}
              height={14}
              fill="none"
              stroke={GOLD}
              strokeWidth={0.55}
              opacity={0.85}
            />
          </g>
          <rect
            x={-9}
            y={-9}
            width={18}
            height={18}
            fill="none"
            stroke={GOLD}
            strokeWidth={0.4}
            opacity={0.6}
          />
          <circle r={1.6} fill={GOLD} />
        </g>
      ))}

      {/* Inner gold rule (defines the content area) */}
      <rect
        x={D}
        y={D}
        width={width - D * 2}
        height={height - D * 2}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.2}
      />
    </svg>
  );
}
