import * as React from 'react';
import { GOLD, NAVY } from '@/lib/certificates/theme';

type Props = {
  width?: number;
  color?: string;
};

export function OrnamentalRule({ width = 360, color = GOLD }: Props) {
  const half = width / 2;
  return (
    <svg
      width={width}
      height={20}
      viewBox={`0 0 ${width} 20`}
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Left line with end curls */}
      <path
        d={`M 8 10 L ${half - 30} 10`}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 4 10 Q 8 4 12 10 Q 8 16 4 10 Z"
        fill={color}
        opacity={0.7}
      />

      {/* Center diamond + medallion */}
      <g transform={`translate(${half} 10)`}>
        <path
          d="M -16 0 L 0 -7 L 16 0 L 0 7 Z"
          fill="none"
          stroke={color}
          strokeWidth={1}
        />
        <path d="M -8 0 L 0 -4 L 8 0 L 0 4 Z" fill={color} opacity={0.85} />
        <circle r={1.6} fill={NAVY} />
      </g>

      {/* Right line with end curls */}
      <path
        d={`M ${half + 30} 10 L ${width - 8} 10`}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${width - 12} 10 Q ${width - 8} 4 ${width - 4} 10 Q ${width - 8} 16 ${width - 12} 10 Z`}
        fill={color}
        opacity={0.7}
      />
    </svg>
  );
}
