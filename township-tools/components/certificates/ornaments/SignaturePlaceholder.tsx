import * as React from 'react';
import { NAVY } from '@/lib/certificates/theme';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

export function SignaturePlaceholder({ width = 220, height = 70, color = NAVY }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 70"
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Generic flowing signature scribble */}
      <path
        d="M 10 50 C 28 18, 44 64, 60 36 S 92 14, 112 42 S 150 52, 168 26 S 198 30, 210 18"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      />
      <path
        d="M 132 44 Q 138 56 150 50"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.7}
      />
    </svg>
  );
}
