import * as React from 'react';
import { GOLD } from '@/lib/certificates/theme';

// Stylized chevron / fletching ornament used to flank the course-meta row.
// Three chevrons stacked to form a small directional accent.
type Props = {
  size?: number;
  flipped?: boolean;
  color?: string;
};

export function Sprig({ size = 44, flipped = false, color = GOLD }: Props) {
  return (
    <svg
      width={size}
      height={size / 2.2}
      viewBox="0 0 100 44"
      style={{ display: 'inline-block' }}
      aria-hidden
    >
      <g transform={flipped ? 'translate(100 0) scale(-1 1)' : undefined}>
        <path
          d="M 6 22 L 22 10 M 6 22 L 22 34"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <path
          d="M 30 22 L 46 10 M 30 22 L 46 34"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.8}
        />
        <path
          d="M 54 22 L 70 10 M 54 22 L 70 34"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.55}
        />
        <circle cx={88} cy={22} r={2.2} fill={color} opacity={0.85} />
      </g>
    </svg>
  );
}
