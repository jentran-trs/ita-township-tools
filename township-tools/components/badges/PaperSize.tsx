"use client";

import { useEffect, useState } from 'react';

// Paper sizes for event files to print. Anything else is typed in as Custom.
export const PAPER_SIZES = [
  'Letter (8.5 × 11 in)',
  'Legal (8.5 × 14 in)',
  'Tabloid (11 × 17 in)',
  'Half letter (5.5 × 8.5 in)',
  'Postcard (4 × 6 in)',
  '5 × 7 in',
  'A4 (8.3 × 11.7 in)',
  'A3 (11.7 × 16.5 in)',
];

const CUSTOM = '__custom__';

/** Paper size picker: the standard sizes, or "Custom…" with a box to type the size. */
export function PaperSizeSelect({
  value,
  onChange,
  className = '',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  className?: string;
}) {
  const isStandard = !value || PAPER_SIZES.includes(value);
  const [custom, setCustom] = useState(!isStandard);
  const [text, setText] = useState(isStandard ? '' : value || '');
  useEffect(() => {
    const std = !value || PAPER_SIZES.includes(value);
    setCustom(!std);
    if (!std) setText(value || '');
  }, [value]);

  const box =
    'px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 focus:outline-none focus:border-amber-500';
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={custom ? CUSTOM : value || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CUSTOM) {
            setCustom(true);
            if (text.trim()) onChange(text.trim());
          } else {
            setCustom(false);
            onChange(v || null);
          }
        }}
        className={box}
        aria-label="Paper size"
      >
        <option value="">Paper size…</option>
        {PAPER_SIZES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {custom && (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onChange(text.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="e.g. 9 × 12 in cardstock"
          maxLength={80}
          className={box + ' w-48'}
          aria-label="Custom paper size"
        />
      )}
    </span>
  );
}
