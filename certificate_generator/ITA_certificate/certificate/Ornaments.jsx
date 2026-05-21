/* global React */
const { useMemo } = React;

/* ============================================================
   Ornaments — reusable SVG pieces for the ribbon-banner cert.
   ============================================================ */

// Tiny laurel / wheat sprig (used at corners + flanking ID line)
window.Sprig = ({ size = 28, color = "#1B2E5B", rotate = 0 }) => (
  <svg width={size} height={size} viewBox="-20 -20 40 40"
       style={{ transform: `rotate(${rotate}deg)` }}>
    <g stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round">
      <path d="M 0 -16 C 0 -8 0 8 0 16" />
      {[...Array(5)].map((_, i) => {
        const y = -12 + i * 6;
        return (
          <g key={i}>
            <path d={`M 0 ${y} Q -7 ${y - 2} -9 ${y - 6}`} />
            <path d={`M 0 ${y} Q 7 ${y - 2} 9 ${y - 6}`} />
          </g>
        );
      })}
      <circle cx="0" cy="-16" r="1.2" fill={color} />
    </g>
  </svg>
);

// Corner fleuron / filigree — uses a balanced quatrefoil
window.CornerFleuron = ({ size = 70, color = "#1B2E5B", gold = "#B89243" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <g stroke={color} fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {/* outer corner */}
      <path d="M 5 5 L 95 5" />
      <path d="M 5 5 L 5 95" />
      <path d="M 12 12 L 78 12" stroke={gold} strokeWidth="0.6" />
      <path d="M 12 12 L 12 78" stroke={gold} strokeWidth="0.6" />
      {/* inner flourish */}
      <path d="M 22 22 Q 38 22 38 38 Q 22 38 22 22 Z" />
      <path d="M 22 22 Q 22 38 38 38" stroke={gold} strokeWidth="0.6" />
      <circle cx="30" cy="30" r="2" fill={gold} stroke="none" />
      {/* curling tendrils */}
      <path d="M 38 22 Q 60 22 70 30 Q 64 36 56 32" />
      <path d="M 22 38 Q 22 60 30 70 Q 36 64 32 56" />
      <circle cx="70" cy="30" r="1.5" fill={color} stroke="none" />
      <circle cx="30" cy="70" r="1.5" fill={color} stroke="none" />
      {/* tiny dots */}
      <circle cx="48" cy="48" r="1" fill={color} stroke="none" />
      <circle cx="54" cy="42" r="0.7" fill={gold} stroke="none" />
      <circle cx="42" cy="54" r="0.7" fill={gold} stroke="none" />
    </g>
  </svg>
);

// Decorative horizontal divider — gold rule with center fleuron
window.OrnamentalRule = ({ width = 380, color = "#1B2E5B", gold = "#B89243" }) => {
  const cx = width / 2;
  return (
    <svg width={width} height="14" viewBox={`0 0 ${width} 14`} style={{ display: "block" }}>
      <line x1="20" y1="7" x2={cx - 22} y2="7" stroke={gold} strokeWidth="0.8" />
      <line x1={cx + 22} y1="7" x2={width - 20} y2="7" stroke={gold} strokeWidth="0.8" />
      <line x1="20" y1="9" x2={cx - 22} y2="9" stroke={gold} strokeWidth="0.4" />
      <line x1={cx + 22} y1="9" x2={width - 20} y2="9" stroke={gold} strokeWidth="0.4" />
      {/* center diamond fleuron */}
      <g transform={`translate(${cx} 7)`}>
        <path d="M -14 0 L 0 -5 L 14 0 L 0 5 Z" fill="none" stroke={color} strokeWidth="0.9" />
        <circle cx="0" cy="0" r="2" fill={gold} />
        <line x1="-22" y1="0" x2="-14" y2="0" stroke={color} strokeWidth="0.9" />
        <line x1="14" y1="0" x2="22" y2="0" stroke={color} strokeWidth="0.9" />
      </g>
      {/* end caps */}
      <circle cx="20" cy="7" r="2" fill={color} />
      <circle cx={width - 20} cy="7" r="2" fill={color} />
    </svg>
  );
};

// Guilloché-style outer border — fine cross-hatched line work
window.GuillocheBorder = ({ width, height, inset = 22, color = "#1B2E5B", gold = "#B89243" }) => {
  // Outer thick + inner thin double border, plus a row of dots between
  const x = inset, y = inset, w = width - inset * 2, h = height - inset * 2;
  const x2 = inset + 10, y2 = inset + 10, w2 = w - 20, h2 = h - 20;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
         style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* outer thick navy frame */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="3.5" />
      {/* gold middle hairline */}
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} fill="none" stroke={gold} strokeWidth="0.7" />
      {/* inner thin navy */}
      <rect x={x2} y={y2} width={w2} height={h2} fill="none" stroke={color} strokeWidth="1.2" />
      {/* faintest inner outline */}
      <rect x={x2 + 4} y={y2 + 4} width={w2 - 8} height={h2 - 8} fill="none" stroke={gold} strokeWidth="0.4" opacity="0.8" />
    </svg>
  );
};

// The actual ribbon banner across the top — folded ribbon w/ tails
window.RibbonBanner = ({ width = 700, color = "#1B2E5B", gold = "#B89243", deep = "#11204A" }) => {
  // height ~110
  const h = 110;
  return (
    <svg width={width} height={h + 50} viewBox={`0 0 ${width} ${h + 50}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="48%" stopColor={color} />
          <stop offset="52%" stopColor={deep} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id="ribbonTail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={deep} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      {/* LEFT tail (drops down + notch) */}
      <path d={`M 0 ${h + 20} L 0 30 L 48 50 L 48 ${h + 38} L 24 ${h + 22} Z`} fill={deep} />
      {/* RIGHT tail */}
      <path d={`M ${width} ${h + 20} L ${width} 30 L ${width - 48} 50 L ${width - 48} ${h + 38} L ${width - 24} ${h + 22} Z`} fill={deep} />

      {/* small inner fold shadows on tails */}
      <path d={`M 0 30 L 48 50 L 48 60 L 0 40 Z`} fill="#000" opacity="0.18" />
      <path d={`M ${width} 30 L ${width - 48} 50 L ${width - 48} 60 L ${width} 40 Z`} fill="#000" opacity="0.18" />

      {/* MAIN banner */}
      <path
        d={`M 40 20 L ${width - 40} 20 L ${width - 18} ${h / 2 + 20} L ${width - 40} ${h + 20} L 40 ${h + 20} L 18 ${h / 2 + 20} Z`}
        fill="url(#ribbonGrad)"
      />
      {/* highlight */}
      <path
        d={`M 40 20 L ${width - 40} 20 L ${width - 18} ${h / 2 + 20} L ${width - 40} 26 L 40 26 L 18 ${h / 2 + 20} Z`}
        fill="#fff" opacity="0.08"
      />
      {/* gold inner stitch */}
      <path
        d={`M 50 28 L ${width - 50} 28 M 50 ${h + 12} L ${width - 50} ${h + 12}`}
        stroke={gold} strokeWidth="0.8" fill="none"
      />
      <path
        d={`M 50 32 L ${width - 50} 32`}
        stroke={gold} strokeWidth="0.3" fill="none" strokeDasharray="2 3"
      />
      <path
        d={`M 50 ${h + 8} L ${width - 50} ${h + 8}`}
        stroke={gold} strokeWidth="0.3" fill="none" strokeDasharray="2 3"
      />
    </svg>
  );
};

// Handwritten-style signature placeholder (a believable cursive flourish)
window.SignaturePlaceholder = ({ width = 220, height = 50, color = "#1B2E5B", seed = 0 }) => {
  const paths = [
    "M 10 50 Q 22 10, 35 35 T 60 30 Q 75 5, 92 35 Q 110 60, 130 30 T 175 35 Q 200 60, 215 25",
    "M 12 45 Q 30 15, 48 38 Q 60 25, 78 40 Q 95 55, 118 28 T 158 38 Q 180 50, 212 30",
  ];
  return (
    <svg width={width} height={height} viewBox="0 0 230 70" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <path d={paths[seed % paths.length]} fill="none" stroke={color}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path d="M 215 25 q 8 -8 12 4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
};

// Embossed verify-seal (bottom-right) — concentric rings with QR-like square
window.VerifySeal = ({ size = 100, color = "#1B2E5B", gold = "#B89243", showQR = true }) => {
  const r = size / 2;
  // tiny pseudo-QR pattern
  const grid = useMemo(() => {
    const cells = [];
    const N = 7;
    const seed = 73;
    let s = seed;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      s = (s * 9301 + 49297) % 233280;
      const on = (s / 233280) > 0.5;
      // mandatory corners
      const corner = (i < 2 && j < 2) || (i < 2 && j > N - 3) || (i > N - 3 && j < 2);
      cells.push({ i, j, on: corner ? ((i + j) % 2 === 0) : on });
    }
    return cells;
  }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={r} cy={r} r={r - 6} fill="none" stroke={gold} strokeWidth="0.5" />
      <circle cx={r} cy={r} r={r - 10} fill="none" stroke={color} strokeWidth="0.8" />
      {showQR ? (
        <g transform={`translate(${r - 18} ${r - 18})`}>
          {grid.map((c, idx) => c.on && (
            <rect key={idx} x={c.j * 5.2} y={c.i * 5.2} width="4.6" height="4.6" fill={color} />
          ))}
        </g>
      ) : (
        <g>
          <text x={r} y={r - 2} textAnchor="middle"
                fontFamily="'Cormorant Garamond', serif" fontWeight="700" fontSize="16" fill={color} letterSpacing="2">VERIFY</text>
          <text x={r} y={r + 14} textAnchor="middle"
                fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="9" fill={gold} letterSpacing="2">ITA-IN.ORG</text>
        </g>
      )}
      {/* arc text top */}
      <defs>
        <path id={`arc-${size}`} d={`M 8 ${r} A ${r - 4} ${r - 4} 0 0 1 ${size - 8} ${r}`} fill="none" />
      </defs>
      <text fontFamily="'Cormorant Garamond', serif" fontWeight="600" fontSize="8" fill={color} letterSpacing="3">
        <textPath href={`#arc-${size}`} startOffset="50%" textAnchor="middle">SCAN&nbsp;&nbsp;TO&nbsp;&nbsp;VERIFY</textPath>
      </text>
    </svg>
  );
};
