/* global React */
const { useId } = React;

/* ---------- shared bits ---------- */

// Sketchy filter — applied to SVG strokes/elements to wobble them
const RoughDefs = ({ id }) => (
  <defs>
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" />
      <feDisplacementMap in="SourceGraphic" scale="2.5" />
    </filter>
  </defs>
);

const RoughBox = ({ x = 0, y = 0, w, h, stroke = "#1B2E5B", sw = 2, dash, fill = "none", inset = 0, filter }) => {
  const rx = x + inset, ry = y + inset, rw = w - inset * 2, rh = h - inset * 2;
  return (
    <rect x={rx} y={ry} width={rw} height={rh}
          stroke={stroke} strokeWidth={sw} fill={fill}
          strokeDasharray={dash} filter={filter} />
  );
};

// Hand-drawn-ish Indiana state outline (simplified polygon)
const IndianaShape = ({ fill = "none", stroke = "#1B2E5B", sw = 1.5, filter }) => (
  <path d="M 35 8 L 165 8 L 165 12 L 168 18 L 167 30 L 165 50 L 162 90 L 158 140 L 152 180 L 144 215 L 134 240 L 122 255 L 108 250 L 92 240 L 80 235 L 70 230 L 60 222 L 55 210 L 50 195 L 42 170 L 36 140 L 32 100 L 31 60 L 33 30 Z"
        fill={fill} stroke={stroke} strokeWidth={sw} filter={filter} strokeLinejoin="round" />
);

// Capitol building silhouette (very simplified)
const Statehouse = ({ stroke = "#1B2E5B", sw = 1.5, fill = "none", filter }) => (
  <g stroke={stroke} strokeWidth={sw} fill={fill} filter={filter} strokeLinejoin="round" strokeLinecap="round">
    {/* base */}
    <rect x="20" y="120" width="360" height="20" />
    {/* steps */}
    <rect x="40" y="110" width="320" height="10" />
    {/* main building */}
    <rect x="60" y="55" width="280" height="55" />
    {/* columns */}
    {[80, 120, 160, 200, 240, 280, 320].map(cx => (
      <line key={cx} x1={cx} y1="60" x2={cx} y2="108" />
    ))}
    {/* pediment */}
    <path d="M 90 55 L 200 30 L 310 55 Z" />
    {/* dome base */}
    <rect x="160" y="0" width="80" height="20" />
    {/* dome */}
    <path d="M 165 0 Q 200 -30 235 0" />
    {/* flag pole */}
    <line x1="200" y1="-40" x2="200" y2="-20" />
  </g>
);

// Seal placeholder (circle with logo image or sketch lines)
const SealPlaceholder = ({ size = 120, sketchy = true, filter, real = false }) => {
  if (real) {
    return <image href="images/ita-logo.jpeg" width={size} height={size} />;
  }
  const r = size / 2;
  return (
    <g filter={filter}>
      <circle cx={r} cy={r} r={r - 2} fill="#fff" stroke="#1B2E5B" strokeWidth="2" />
      <circle cx={r} cy={r} r={r - 10} fill="none" stroke="#1B2E5B" strokeWidth="1" />
      <text x={r} y={r - 8} textAnchor="middle" fontFamily="Patrick Hand" fontSize={size * 0.18} fill="#1B2E5B" fontWeight="700">ITA</text>
      <text x={r} y={r + 14} textAnchor="middle" fontFamily="Caveat" fontSize={size * 0.11} fill="#1B2E5B" fontStyle="italic">[ official seal ]</text>
    </g>
  );
};

// Sketch underline (used for fields)
const Squiggle = ({ x, y, w, stroke = "#1B2E5B", sw = 1.6, filter }) => (
  <path d={`M ${x} ${y} Q ${x + w*0.25} ${y - 2}, ${x + w*0.5} ${y} T ${x + w} ${y}`}
        fill="none" stroke={stroke} strokeWidth={sw} filter={filter} />
);

// Cross-hatched corner ornament
const CornerOrnament = ({ x, y, size = 60, rotate = 0, stroke = "#1B2E5B", filter }) => (
  <g transform={`translate(${x},${y}) rotate(${rotate})`} filter={filter}>
    <path d={`M 0 0 L ${size} 0 M 0 0 L 0 ${size}`} stroke={stroke} strokeWidth="2" fill="none" />
    <path d={`M 5 5 L ${size*0.6} 5 M 5 5 L 5 ${size*0.6}`} stroke={stroke} strokeWidth="1" fill="none" />
    <circle cx={size*0.15} cy={size*0.15} r="3" fill="none" stroke={stroke} strokeWidth="1" />
    {/* leaf/sprig motif */}
    <g transform={`translate(${size*0.3},${size*0.3})`}>
      <path d="M 0 0 Q 8 -4 12 0 Q 8 4 0 0" fill="none" stroke={stroke} strokeWidth="1" />
      <path d="M 0 0 Q 4 -8 0 -12 Q -4 -8 0 0" fill="none" stroke={stroke} strokeWidth="1" />
      <path d="M 0 0 Q -8 -4 -12 0 Q -8 4 0 0" fill="none" stroke={stroke} strokeWidth="1" />
    </g>
  </g>
);

// Field row (label + handwritten value placeholder)
const Field = ({ x, y, w, label, value, filter, labelSize = 11, valueSize = 22, valueFont = "Caveat" }) => (
  <g>
    <text x={x} y={y} fontFamily="Special Elite" fontSize={labelSize}
          fill="#666" letterSpacing="1.5">{label.toUpperCase()}</text>
    <text x={x} y={y + valueSize + 4} fontFamily={valueFont} fontSize={valueSize}
          fill="#1B2E5B">{value}</text>
    <Squiggle x={x} y={y + valueSize + 10} w={w} filter={filter} />
  </g>
);

/* ============================================================
   WIREFRAME 1 — Classic centered diploma
   ============================================================ */
const WireClassic = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />
      {/* paper grain */}
      <rect width={W} height={H} fill="url(#paper-grain)" />
      {/* outer border */}
      <RoughBox x={30} y={30} w={W-60} h={H-60} sw={3} filter={`url(#${fid})`} />
      <RoughBox x={45} y={45} w={W-90} h={H-90} sw={1} dash="6 4" filter={`url(#${fid})`} />

      {/* corner ornaments */}
      <CornerOrnament x={70} y={70} size={70} filter={`url(#${fid})`} />
      <CornerOrnament x={W-70} y={70} size={70} rotate={90} filter={`url(#${fid})`} />
      <CornerOrnament x={W-70} y={H-70} size={70} rotate={180} filter={`url(#${fid})`} />
      <CornerOrnament x={70} y={H-70} size={70} rotate={270} filter={`url(#${fid})`} />

      {/* seal at top */}
      <g transform={`translate(${W/2 - 50}, 80)`}>
        <SealPlaceholder size={100} filter={`url(#${fid})`} />
      </g>

      {/* title */}
      <text x={W/2} y={235} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="58" fill="#1B2E5B" letterSpacing="2">Certificate of Completion</text>
      <Squiggle x={W/2 - 220} y={258} w={440} filter={`url(#${fid})`} />

      {/* subhead */}
      <text x={W/2} y={300} textAnchor="middle" fontFamily="Special Elite"
            fontSize="14" fill="#666" letterSpacing="3">PRESENTED&nbsp;&nbsp;BY&nbsp;&nbsp;THE&nbsp;&nbsp;INDIANA&nbsp;&nbsp;TOWNSHIP&nbsp;&nbsp;ASSOCIATION</text>

      <text x={W/2} y={350} textAnchor="middle" fontFamily="Patrick Hand"
            fontSize="20" fill="#333">This certificate is awarded to</text>

      {/* recipient name */}
      <text x={W/2} y={425} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="72" fill="#1B2E5B">[ Recipient Full Name ]</text>
      <Squiggle x={W/2 - 280} y={445} w={560} sw={2} filter={`url(#${fid})`} />

      {/* statement */}
      <text x={W/2} y={490} textAnchor="middle" fontFamily="Patrick Hand"
            fontSize="20" fill="#333">has successfully completed</text>
      <text x={W/2} y={530} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="38" fill="#1B2E5B" fontStyle="italic">[ Class / Training Program Name ]</text>

      {/* meta row */}
      <g transform="translate(0, 580)">
        <Field x={150} y={0} w={150} label="Hours" value="[ 5.0 ]" filter={`url(#${fid})`} />
        <Field x={340} y={0} w={150} label="Method" value="[ In-Person ]" filter={`url(#${fid})`} />
        <Field x={550} y={0} w={150} label="Date" value="[ MM/DD/YYYY ]" filter={`url(#${fid})`} />
        <Field x={770} y={0} w={180} label="Township / County" value="[ Center / Marion ]" filter={`url(#${fid})`} />
      </g>

      {/* signature */}
      <g transform="translate(150, 690)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="28" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-10} y={10} w={260} filter={`url(#${fid})`} />
        <text x={0} y={32} fontFamily="Special Elite" fontSize="11" fill="#444" letterSpacing="1">EXECUTIVE DIRECTOR • INDIANA TOWNSHIP ASSOCIATION</text>
      </g>
      <g transform="translate(720, 690)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="28" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-10} y={10} w={260} filter={`url(#${fid})`} />
        <text x={0} y={32} fontFamily="Special Elite" fontSize="11" fill="#444" letterSpacing="1">BOARD PRESIDENT • INDIANA TOWNSHIP ASSOCIATION</text>
      </g>

      {/* IDs bottom corner */}
      <g transform={`translate(${W/2}, 770)`}>
        <text textAnchor="middle" fontFamily="Special Elite" fontSize="10" fill="#888" letterSpacing="2">
          COURSE ID  [ITA-2026-001]   •   CREDENTIAL ID  [ITA-AB12-CD34-EF56]
        </text>
      </g>
    </svg>
  );
};

/* ============================================================
   WIREFRAME 2 — Civic Plaque (asymmetric, seal-left)
   ============================================================ */
const WireCivic = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />

      {/* heavy left rail */}
      <rect x={0} y={0} width={320} height={H} fill="#1B2E5B" opacity="0.06" />
      <RoughBox x={40} y={40} w={W-80} h={H-80} sw={2.5} filter={`url(#${fid})`} />
      <line x1={340} y1={70} x2={340} y2={H-70} stroke="#1B2E5B" strokeWidth="2" filter={`url(#${fid})`} />
      <line x1={350} y1={70} x2={350} y2={H-70} stroke="#1B2E5B" strokeWidth="1" strokeDasharray="3 4" filter={`url(#${fid})`} />

      {/* LEFT: big seal + tag */}
      <g transform="translate(95, 200)">
        <SealPlaceholder size={170} filter={`url(#${fid})`} />
      </g>
      <text x={180} y={420} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="32" fill="#1B2E5B">Indiana Township</text>
      <text x={180} y={452} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="32" fill="#1B2E5B">Association</text>
      <Squiggle x={70} y={470} w={220} filter={`url(#${fid})`} />
      <text x={180} y={500} textAnchor="middle" fontFamily="Special Elite"
            fontSize="11" fill="#666" letterSpacing="3">EST.  •  TRAINING DIVISION</text>

      {/* tiny indiana shape */}
      <g transform="translate(120, 560) scale(0.45)">
        <IndianaShape stroke="#1B2E5B" sw={1.5} filter={`url(#${fid})`} />
      </g>

      {/* RIGHT: content */}
      <text x={400} y={130} fontFamily="Special Elite" fontSize="13" fill="#666" letterSpacing="4">CERTIFICATE&nbsp;&nbsp;OF</text>
      <text x={400} y={195} fontFamily="Caveat" fontWeight="700" fontSize="78" fill="#1B2E5B">Completion</text>
      <Squiggle x={400} y={213} w={420} sw={2.2} filter={`url(#${fid})`} />

      <text x={400} y={270} fontFamily="Patrick Hand" fontSize="18" fill="#333">This is to certify that</text>
      <text x={400} y={335} fontFamily="Caveat" fontWeight="700" fontSize="56" fill="#1B2E5B">[ Recipient Full Name ]</text>
      <Squiggle x={400} y={352} w={620} filter={`url(#${fid})`} />

      <text x={400} y={395} fontFamily="Patrick Hand" fontSize="17" fill="#333">
        has successfully completed the training program
      </text>
      <text x={400} y={445} fontFamily="Caveat" fontWeight="700" fontSize="36" fill="#1B2E5B" fontStyle="italic">
        [ Class / Training Name ]
      </text>

      {/* meta grid */}
      <g transform="translate(400, 490)">
        <Field x={0}   y={0} w={130} label="Hours"   value="[ 5.0 ]" filter={`url(#${fid})`} />
        <Field x={170} y={0} w={130} label="Method"  value="[ Online ]" filter={`url(#${fid})`} />
        <Field x={340} y={0} w={130} label="Date"    value="[ MM/DD/YYYY ]" filter={`url(#${fid})`} />
        <Field x={510} y={0} w={170} label="Twp / Co" value="[ Wayne / Allen ]" filter={`url(#${fid})`} />
      </g>

      {/* sigs as a row of two */}
      <g transform="translate(400, 620)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="26" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={260} filter={`url(#${fid})`} />
        <text x={0} y={30} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">EXECUTIVE DIRECTOR</text>
        <text x={0} y={45} fontFamily="Special Elite" fontSize="10" fill="#666" letterSpacing="1.5">Indiana Township Association</text>
      </g>
      <g transform="translate(740, 620)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="26" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={260} filter={`url(#${fid})`} />
        <text x={0} y={30} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">BOARD PRESIDENT</text>
        <text x={0} y={45} fontFamily="Special Elite" fontSize="10" fill="#666" letterSpacing="1.5">Indiana Township Association</text>
      </g>

      {/* IDs */}
      <g transform="translate(400, 730)">
        <text fontFamily="Special Elite" fontSize="10" fill="#666" letterSpacing="2">
          COURSE&nbsp;ID&nbsp; [ITA-2026-001]
        </text>
        <text y={18} fontFamily="Special Elite" fontSize="9" fill="#999" letterSpacing="1.5">
          credential&nbsp;id&nbsp; [ita-ab12-cd34-ef56]&nbsp;·&nbsp;verify at ita-in.org/verify
        </text>
      </g>
    </svg>
  );
};

/* ============================================================
   WIREFRAME 3 — Statehouse Banner Header
   ============================================================ */
const WireStatehouse = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />

      <RoughBox x={40} y={40} w={W-80} h={H-80} sw={2} filter={`url(#${fid})`} />

      {/* TOP BANNER — statehouse silhouette */}
      <rect x={60} y={60} width={W-120} height={180} fill="#1B2E5B" opacity="0.05" />
      <line x1={60} y1={240} x2={W-60} y2={240} stroke="#1B2E5B" strokeWidth="2" filter={`url(#${fid})`} />
      <line x1={60} y1={248} x2={W-60} y2={248} stroke="#1B2E5B" strokeWidth="1" filter={`url(#${fid})`} />

      <g transform="translate(150, 100) scale(0.85)">
        <Statehouse stroke="#1B2E5B" sw={1.6} filter={`url(#${fid})`} />
      </g>
      <g transform="translate(680, 100) scale(0.85) scale(-1, 1)">
        <Statehouse stroke="#1B2E5B" sw={1.6} filter={`url(#${fid})`} />
      </g>

      {/* seal centered overlapping banner */}
      <g transform={`translate(${W/2 - 65}, 175)`}>
        <SealPlaceholder size={130} filter={`url(#${fid})`} />
      </g>

      {/* title */}
      <text x={W/2} y={310} textAnchor="middle" fontFamily="Special Elite" fontSize="14" fill="#666" letterSpacing="6">
        INDIANA&nbsp;&nbsp;TOWNSHIP&nbsp;&nbsp;ASSOCIATION
      </text>
      <text x={W/2} y={375} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="64" fill="#1B2E5B">Certificate of Completion</text>
      <Squiggle x={W/2 - 200} y={395} w={400} filter={`url(#${fid})`} />

      <text x={W/2} y={440} textAnchor="middle" fontFamily="Patrick Hand" fontSize="20" fill="#333">
        Awarded to
      </text>
      <text x={W/2} y={510} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="64" fill="#1B2E5B">[ Recipient Full Name ]</text>
      <Squiggle x={W/2 - 260} y={527} w={520} filter={`url(#${fid})`} />

      <text x={W/2} y={565} textAnchor="middle" fontFamily="Patrick Hand" fontSize="18" fill="#333">
        for successful completion of
      </text>
      <text x={W/2} y={605} textAnchor="middle" fontFamily="Caveat" fontWeight="700" fontSize="34"
            fill="#1B2E5B" fontStyle="italic">[ Class / Training Name ]</text>

      {/* meta row in chips */}
      <g transform="translate(0, 645)">
        {[
          { x: 180, label: "HOURS", val: "[ 5.0 ]" },
          { x: 360, label: "METHOD", val: "[ Hybrid ]" },
          { x: 555, label: "DATE", val: "[ MM/DD/YYYY ]" },
          { x: 775, label: "TWP / COUNTY", val: "[ Pike / Marion ]" },
        ].map((c, i) => (
          <g key={i}>
            <RoughBox x={c.x - 10} y={-5} w={150} h={42} sw={1.2} dash="3 3" filter={`url(#${fid})`} />
            <text x={c.x} y={10} fontFamily="Special Elite" fontSize="9" fill="#666" letterSpacing="2">{c.label}</text>
            <text x={c.x} y={32} fontFamily="Caveat" fontSize="20" fill="#1B2E5B">{c.val}</text>
          </g>
        ))}
      </g>

      {/* sigs */}
      <g transform="translate(180, 730)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="24" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={240} filter={`url(#${fid})`} />
        <text x={0} y={26} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">EXECUTIVE DIRECTOR  •  ITA</text>
      </g>
      <g transform="translate(700, 730)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="24" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={240} filter={`url(#${fid})`} />
        <text x={0} y={26} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">BOARD PRESIDENT  •  ITA</text>
      </g>

      {/* ID footer */}
      <text x={60} y={H-20} fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">
        COURSE ID [ITA-2026-001]
      </text>
      <text x={W-60} y={H-20} textAnchor="end" fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">
        CREDENTIAL [ITA-AB12-CD34-EF56]
      </text>
    </svg>
  );
};

/* ============================================================
   WIREFRAME 4 — Indiana outline watermark, modern split
   ============================================================ */
const WireMap = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />
      {/* clean thin border */}
      <RoughBox x={50} y={50} w={W-100} h={H-100} sw={1.2} filter={`url(#${fid})`} />

      {/* Indiana huge faded watermark on the right */}
      <g transform="translate(700, 120) scale(2.2)" opacity="0.08">
        <IndianaShape fill="#1B2E5B" stroke="#1B2E5B" sw={2} />
      </g>
      {/* small dotted Indiana mark at top-left */}
      <g transform="translate(90, 90) scale(0.45)">
        <IndianaShape stroke="#1B2E5B" sw={1.5} filter={`url(#${fid})`} />
        <circle cx="95" cy="155" r="4" fill="#1B2E5B" />
        <text x="105" y="160" fontFamily="Caveat" fontSize="16" fill="#1B2E5B" fontStyle="italic">[ training delivered ]</text>
      </g>

      {/* TOP: small logo + wordmark, left aligned */}
      <g transform="translate(90, 95)">
        <SealPlaceholder size={55} filter={`url(#${fid})`} />
        <text x={70} y={22} fontFamily="Special Elite" fontSize="11" fill="#666" letterSpacing="3">INDIANA TOWNSHIP ASSOCIATION</text>
        <text x={70} y={42} fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">TRAINING & DEVELOPMENT</text>
      </g>

      {/* big horizontal rule */}
      <line x1={90} y1={195} x2={W-90} y2={195} stroke="#1B2E5B" strokeWidth="1.5" filter={`url(#${fid})`} />
      <text x={W-90} y={185} textAnchor="end" fontFamily="Special Elite" fontSize="10" fill="#999" letterSpacing="2">CERTIFICATE</text>

      {/* Title, left-aligned modern style */}
      <text x={90} y={280} fontFamily="Special Elite" fontSize="16" fill="#666" letterSpacing="6">CERTIFICATE&nbsp;&nbsp;OF&nbsp;&nbsp;COMPLETION</text>

      <text x={90} y={360} fontFamily="Patrick Hand" fontSize="20" fill="#666">presented to</text>
      <text x={90} y={445} fontFamily="Caveat" fontWeight="700" fontSize="92" fill="#1B2E5B">
        [ Recipient Full Name ]
      </text>
      <Squiggle x={90} y={465} w={700} sw={2} filter={`url(#${fid})`} />

      <text x={90} y={510} fontFamily="Patrick Hand" fontSize="18" fill="#444">
        For successful completion of the training program
      </text>
      <text x={90} y={560} fontFamily="Caveat" fontWeight="700" fontSize="44" fill="#1B2E5B" fontStyle="italic">
        [ Class / Training Name ]
      </text>

      {/* horizontal "data" strip */}
      <line x1={90} y1={615} x2={W-90} y2={615} stroke="#1B2E5B" strokeWidth="1" filter={`url(#${fid})`} />
      <g transform="translate(0, 630)">
        {[
          { x: 90,  label: "Hours",  val: "[ 5.0 ]" },
          { x: 260, label: "Method", val: "[ In-Person ]" },
          { x: 460, label: "Date",   val: "[ MM/DD/YY ]" },
          { x: 660, label: "Township", val: "[ Center ]" },
          { x: 830, label: "County",   val: "[ Marion ]" },
        ].map((c, i) => (
          <g key={i}>
            <text x={c.x} y={12} fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">{c.label.toUpperCase()}</text>
            <text x={c.x} y={36} fontFamily="Caveat" fontWeight="700" fontSize="22" fill="#1B2E5B">{c.val}</text>
          </g>
        ))}
      </g>
      <line x1={90} y1={685} x2={W-90} y2={685} stroke="#1B2E5B" strokeWidth="1" filter={`url(#${fid})`} />

      {/* signatures inline at bottom */}
      <g transform="translate(90, 730)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="22" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={220} filter={`url(#${fid})`} />
        <text x={0} y={26} fontFamily="Special Elite" fontSize="9" fill="#666" letterSpacing="1.5">EXECUTIVE DIRECTOR  •  Indiana Township Association</text>
      </g>
      <g transform="translate(560, 730)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="22" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={220} filter={`url(#${fid})`} />
        <text x={0} y={26} fontFamily="Special Elite" fontSize="9" fill="#666" letterSpacing="1.5">BOARD PRESIDENT  •  Indiana Township Association</text>
      </g>

      {/* IDs vertical on right edge */}
      <g transform={`translate(${W-65}, 280) rotate(90)`}>
        <text fontFamily="Special Elite" fontSize="9" fill="#999" letterSpacing="2">
          COURSE [ITA-2026-001] • CRED [ITA-AB12-CD34-EF56]
        </text>
      </g>
    </svg>
  );
};

/* ============================================================
   WIREFRAME 5 — Ribbon banner formal
   ============================================================ */
const WireRibbon = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />
      <RoughBox x={35} y={35} w={W-70} h={H-70} sw={3} filter={`url(#${fid})`} />
      <RoughBox x={55} y={55} w={W-110} h={H-110} sw={0.8} dash="2 5" filter={`url(#${fid})`} />

      {/* RIBBON across top */}
      <g filter={`url(#${fid})`}>
        {/* left tail */}
        <path d="M 80 120 L 130 95 L 170 120 L 130 145 Z" fill="#1B2E5B" opacity="0.85" />
        {/* right tail */}
        <path d={`M ${W-80} 120 L ${W-130} 95 L ${W-170} 120 L ${W-130} 145 Z`} fill="#1B2E5B" opacity="0.85" />
        {/* main banner */}
        <path d={`M 130 80 L ${W-130} 80 L ${W-110} 120 L ${W-130} 160 L 130 160 L 110 120 Z`}
              fill="#1B2E5B" />
      </g>
      <text x={W/2} y={130} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="48" fill="#fbfaf5">Certificate of Completion</text>

      {/* seal hanging below ribbon */}
      <g transform={`translate(${W/2 - 65}, 180)`}>
        <SealPlaceholder size={130} filter={`url(#${fid})`} />
      </g>
      {/* hanging string */}
      <line x1={W/2} y1={160} x2={W/2} y2={185} stroke="#1B2E5B" strokeWidth="1.5" filter={`url(#${fid})`} />

      <text x={W/2} y={355} textAnchor="middle" fontFamily="Special Elite" fontSize="12" fill="#666" letterSpacing="5">
        INDIANA&nbsp;&nbsp;TOWNSHIP&nbsp;&nbsp;ASSOCIATION
      </text>

      <text x={W/2} y={395} textAnchor="middle" fontFamily="Patrick Hand" fontSize="18" fill="#444">
        Be it known that
      </text>
      <text x={W/2} y={460} textAnchor="middle" fontFamily="Caveat" fontWeight="700"
            fontSize="58" fill="#1B2E5B">[ Recipient Full Name ]</text>
      <Squiggle x={W/2 - 250} y={478} w={500} filter={`url(#${fid})`} />

      <text x={W/2} y={520} textAnchor="middle" fontFamily="Patrick Hand" fontSize="17" fill="#444">
        of <tspan fill="#1B2E5B" fontWeight="700">[ Center Township, Marion County ]</tspan> has successfully completed
      </text>
      <text x={W/2} y={565} textAnchor="middle" fontFamily="Caveat" fontWeight="700" fontSize="36" fill="#1B2E5B" fontStyle="italic">
        [ Class / Training Name ]
      </text>
      <text x={W/2} y={600} textAnchor="middle" fontFamily="Patrick Hand" fontSize="16" fill="#666">
        a <tspan fontWeight="700">[ 5.0 ]</tspan> hour <tspan fontWeight="700">[ In-Person ]</tspan> training, on <tspan fontWeight="700">[ MM / DD / YYYY ]</tspan>.
      </text>

      {/* sigs flanking small medallion */}
      <g transform="translate(150, 680)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="26" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={260} filter={`url(#${fid})`} />
        <text x={0} y={28} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">EXECUTIVE DIRECTOR</text>
        <text x={0} y={42} fontFamily="Special Elite" fontSize="9" fill="#777" letterSpacing="1.5">Indiana Township Association</text>
      </g>
      <g transform={`translate(${W/2 - 55}, 680)`}>
        {/* small wax-seal style medallion */}
        <circle cx="55" cy="40" r="38" fill="#1B2E5B" opacity="0.12" filter={`url(#${fid})`} />
        <circle cx="55" cy="40" r="30" fill="none" stroke="#1B2E5B" strokeWidth="1.2" filter={`url(#${fid})`} />
        <text x="55" y="36" textAnchor="middle" fontFamily="Special Elite" fontSize="7" fill="#1B2E5B" letterSpacing="1">OFFICIAL</text>
        <text x="55" y="48" textAnchor="middle" fontFamily="Caveat" fontWeight="700" fontSize="16" fill="#1B2E5B">ITA</text>
      </g>
      <g transform={`translate(${W-410}, 680)`}>
        <text x={0} y={0} fontFamily="Caveat" fontSize="26" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <Squiggle x={-5} y={8} w={260} filter={`url(#${fid})`} />
        <text x={0} y={28} fontFamily="Special Elite" fontSize="10" fill="#444" letterSpacing="1.5">BOARD PRESIDENT</text>
        <text x={0} y={42} fontFamily="Special Elite" fontSize="9" fill="#777" letterSpacing="1.5">Indiana Township Association</text>
      </g>

      <text x={W/2} y={770} textAnchor="middle" fontFamily="Special Elite" fontSize="9" fill="#999" letterSpacing="2">
        COURSE&nbsp;ID&nbsp;[ITA-2026-001]&nbsp;&nbsp;·&nbsp;&nbsp;CREDENTIAL&nbsp;[ITA-AB12-CD34-EF56]&nbsp;&nbsp;·&nbsp;&nbsp;VERIFY&nbsp;AT&nbsp;ITA-IN.ORG/VERIFY
      </text>
    </svg>
  );
};

/* ============================================================
   WIREFRAME 6 — Modern minimal / type-driven
   ============================================================ */
const WireMinimal = () => {
  const fid = useId().replace(/:/g, "");
  const W = 1100, H = 800;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#fbfaf5", display: "block" }}>
      <RoughDefs id={fid} />

      {/* a single thin border at very edge */}
      <RoughBox x={20} y={20} w={W-40} h={H-40} sw={0.8} filter={`url(#${fid})`} />

      {/* top strip */}
      <g transform="translate(80, 80)">
        <SealPlaceholder size={48} filter={`url(#${fid})`} />
        <text x={62} y={20} fontFamily="Special Elite" fontSize="11" fill="#1B2E5B" letterSpacing="3">INDIANA TOWNSHIP ASSOCIATION</text>
        <text x={62} y={38} fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">ita-in.org</text>
      </g>
      <text x={W-80} y={100} textAnchor="end" fontFamily="Special Elite" fontSize="10" fill="#888" letterSpacing="3">
        N°&nbsp;&nbsp;[ITA-2026-001]
      </text>
      <text x={W-80} y={118} textAnchor="end" fontFamily="Special Elite" fontSize="9" fill="#aaa" letterSpacing="2">
        cred&nbsp;[ITA-AB12-CD34-EF56]
      </text>
      <line x1={80} y1={150} x2={W-80} y2={150} stroke="#1B2E5B" strokeWidth="0.8" filter={`url(#${fid})`} />

      {/* HUGE typographic title — fills width */}
      <text x={80} y={285} fontFamily="Caveat" fontWeight="700" fontSize="170" fill="#1B2E5B" letterSpacing="-2">
        Certificate
      </text>
      <text x={80} y={345} fontFamily="Special Elite" fontSize="22" fill="#666" letterSpacing="6">
        OF&nbsp;&nbsp;COMPLETION
      </text>

      {/* divider */}
      <line x1={80} y1={385} x2={W-80} y2={385} stroke="#1B2E5B" strokeWidth="0.8" filter={`url(#${fid})`} />

      {/* recipient */}
      <text x={80} y={420} fontFamily="Special Elite" fontSize="10" fill="#888" letterSpacing="3">RECIPIENT</text>
      <text x={80} y={485} fontFamily="Caveat" fontWeight="700" fontSize="68" fill="#1B2E5B">[ Recipient Full Name ]</text>

      {/* training */}
      <text x={80} y={540} fontFamily="Special Elite" fontSize="10" fill="#888" letterSpacing="3">FOR COMPLETING</text>
      <text x={80} y={580} fontFamily="Caveat" fontWeight="700" fontSize="38" fill="#1B2E5B" fontStyle="italic">
        [ Class / Training Program Name ]
      </text>

      {/* data table */}
      <line x1={80} y1={620} x2={W-80} y2={620} stroke="#1B2E5B" strokeWidth="0.8" filter={`url(#${fid})`} />
      <g transform="translate(0, 640)">
        {[
          { x: 80,  label: "Hours",   val: "[ 5.0 ]" },
          { x: 250, label: "Method",  val: "[ Hybrid ]" },
          { x: 420, label: "Date",    val: "[ MM/DD/YY ]" },
          { x: 600, label: "Township",val: "[ Center ]" },
          { x: 770, label: "County",  val: "[ Marion ]" },
        ].map((c, i) => (
          <g key={i}>
            <text x={c.x} y={10} fontFamily="Special Elite" fontSize="9" fill="#888" letterSpacing="2">{c.label.toUpperCase()}</text>
            <text x={c.x} y={36} fontFamily="Caveat" fontWeight="700" fontSize="22" fill="#1B2E5B">{c.val}</text>
          </g>
        ))}
      </g>
      <line x1={80} y1={695} x2={W-80} y2={695} stroke="#1B2E5B" strokeWidth="0.8" filter={`url(#${fid})`} />

      {/* sigs */}
      <g transform="translate(80, 735)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="22" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <text x={0} y={22} fontFamily="Special Elite" fontSize="9" fill="#666" letterSpacing="1.5">
          EXECUTIVE&nbsp;DIRECTOR · INDIANA TOWNSHIP ASSOCIATION
        </text>
      </g>
      <g transform="translate(560, 735)">
        <text x={0} y={0} fontFamily="Caveat" fontSize="22" fill="#1B2E5B" fontStyle="italic">[ signature ]</text>
        <text x={0} y={22} fontFamily="Special Elite" fontSize="9" fill="#666" letterSpacing="1.5">
          BOARD&nbsp;PRESIDENT · INDIANA TOWNSHIP ASSOCIATION
        </text>
      </g>
    </svg>
  );
};

window.WireClassic = WireClassic;
window.WireCivic = WireCivic;
window.WireStatehouse = WireStatehouse;
window.WireMap = WireMap;
window.WireRibbon = WireRibbon;
window.WireMinimal = WireMinimal;
