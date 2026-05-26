import * as React from 'react';
import { GOLD } from '@/lib/certificates/theme';

// Small leaf-curl flourish anchored in a corner. Subtle, gold, lightly drawn —
// matches the cleaner aesthetic of the certificate without competing with the
// content.
type Props = {
  size?: number;
  corner: 'tl' | 'tr' | 'bl' | 'br';
  color?: string;
};

export function CornerFleuron({ size = 56, corner, color = GOLD }: Props) {
  const transforms: Record<Props['corner'], string> = {
    tl: 'rotate(0)',
    tr: 'translate(100 0) scale(-1 1)',
    bl: 'translate(0 100) scale(1 -1)',
    br: 'translate(100 100) scale(-1 -1)',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <g transform={transforms[corner]}>
        {/* Long curve from corner inward, ending in a leaf bud */}
        <path
          d="M 8 8 Q 26 14 38 28 Q 48 40 50 56"
          fill="none"
          stroke={color}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        {/* Secondary tighter curl below */}
        <path
          d="M 14 30 Q 22 38 26 50 Q 28 60 22 66 Q 16 70 14 64"
          fill="none"
          stroke={color}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
        {/* Single leaf tip */}
        <path
          d="M 50 56 Q 58 56 60 64 Q 54 66 50 60 Z"
          fill={color}
          opacity={0.85}
        />
        {/* Tiny accent dot */}
        <circle cx={16} cy={18} r={1.2} fill={color} opacity={0.7} />
      </g>
    </svg>
  );
}
