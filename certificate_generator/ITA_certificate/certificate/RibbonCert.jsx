/* global React, Sprig, CornerFleuron, OrnamentalRule, GuillocheBorder, RibbonBanner, SignaturePlaceholder, VerifySeal */
const { useMemo } = React;

/* ============================================================
   The Certificate
   ============================================================ */

// Sample / template data sets the tweaks panel can toggle.
window.SAMPLE_DATA = {
  recipientName: "Margaret A. Whitfield",
  township: "Center Township",
  county: "Marion County",
  courseName: "Fiduciary Duties for Township Trustees",
  hours: "5.0",
  method: "In-Person",
  date: "March 14, 2026",
  courseId: "ITA-2026-TRT-014",
  credentialId: "ITA-AB12-CD34-EF56-GH78",
  signers: [
    { name: "Jane Q. Director", title: "Executive Director" },
    { name: "John A. President", title: "Board President" },
  ],
};

window.SAMPLE_DATA_2 = {
  recipientName: "Dr. Christopher Whitman-Hawthorne",
  township: "Wayne Township",
  county: "Allen County",
  courseName: "Open Door Law & Public Records Act Compliance",
  hours: "8.0",
  method: "Hybrid",
  date: "October 02, 2026",
  courseId: "ITA-2026-ODL-031",
  credentialId: "ITA-XK91-LP44-MN02-RS18",
  signers: [
    { name: "Jane Q. Director", title: "Executive Director" },
    { name: "John A. President", title: "Board President" },
  ],
};

window.TEMPLATE_DATA = {
  recipientName: "{{recipient_name}}",
  township: "{{township}}",
  county: "{{county}}",
  courseName: "{{course_name}}",
  hours: "{{hours}}",
  method: "{{method}}",
  date: "{{date}}",
  courseId: "{{course_id}}",
  credentialId: "{{credential_id}}",
  signers: [
    { name: "{{signer_1_name}}", title: "{{signer_1_title}}" },
    { name: "{{signer_2_name}}", title: "{{signer_2_title}}" },
  ],
};

/* The certificate is built at fixed pixel size (1100 × 850 = 11" × 8.5" @ 100 DPI).
   The outer .stage scales it to fit the viewport. */
const W = 1100;
const H = 850;

window.RibbonCertificate = ({
  data = window.SAMPLE_DATA,
  signerCount = 2,
  goldAccent = true,
  showSprigs = true,
  paper = "cream",
}) => {
  const NAVY = "#1B2E5B";
  const GOLD = goldAccent ? "#B89243" : "#9DA3B4";
  const DEEP = "#11204A";

  const bg = paper === "cream"
    ? "#FBFAF5"
    : paper === "white"
      ? "#FFFFFF"
      : paper === "ivory"
        ? "#F6F0E1"
        : "#FBFAF5";

  const sigs = data.signers.slice(0, signerCount);

  return (
    <div className="cert-root" style={{ width: W, height: H, position: "relative", background: bg, color: NAVY, fontFamily: "'Cormorant Garamond', serif", overflow: "hidden" }}>
      {/* paper texture overlay */}
      {paper !== "white" && (
        <div className="cert-paper-tex" style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            `radial-gradient(circle at 18% 22%, rgba(184,146,67,0.05), transparent 40%),
             radial-gradient(circle at 82% 78%, rgba(27,46,91,0.04), transparent 45%),
             url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0 0.3  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          mixBlendMode: "multiply",
        }} />
      )}

      <GuillocheBorder width={W} height={H} inset={22} color={NAVY} gold={GOLD} />

      {/* corner fleurons */}
      <div style={{ position: "absolute", top: 38, left: 38 }}>
        <CornerFleuron size={62} color={NAVY} gold={GOLD} />
      </div>
      <div style={{ position: "absolute", top: 38, right: 38, transform: "scaleX(-1)" }}>
        <CornerFleuron size={62} color={NAVY} gold={GOLD} />
      </div>
      <div style={{ position: "absolute", bottom: 38, left: 38, transform: "scaleY(-1)" }}>
        <CornerFleuron size={62} color={NAVY} gold={GOLD} />
      </div>
      <div style={{ position: "absolute", bottom: 38, right: 38, transform: "scale(-1,-1)" }}>
        <CornerFleuron size={62} color={NAVY} gold={GOLD} />
      </div>

      {/* RIBBON at top */}
      <div style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.12))" }}>
        <RibbonBanner width={760} color={NAVY} gold={GOLD} deep={DEEP} />
        {/* ribbon title overlay — single line */}
        <div style={{
          position: "absolute", top: 20, left: 0, width: 760, height: 110,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 10,
            color: GOLD, letterSpacing: "5px", textTransform: "uppercase", marginBottom: 6,
            opacity: 0.95,
          }}>— &nbsp;Awarded by the Indiana Township Association&nbsp; —</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 30,
            color: "#FBFAF5", letterSpacing: "5px", textTransform: "uppercase",
            whiteSpace: "nowrap", lineHeight: 1,
          }}>Certificate of Completion</div>
        </div>
      </div>

      {/* hanging seal / logo — overlapping bottom of ribbon */}
      <div style={{
        position: "absolute", top: 175, left: "50%", transform: "translateX(-50%)",
        zIndex: 3,
      }}>
        {/* gold ring backing */}
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: `radial-gradient(circle at 50% 30%, ${GOLD}40 0%, transparent 70%)`,
          padding: 4, boxSizing: "border-box",
          boxShadow: `0 0 0 1px ${GOLD}, 0 0 0 4px ${bg}, 0 0 0 5px ${NAVY}33, 0 12px 26px -8px rgba(17,32,74,0.45)`,
        }}>
          <img src="images/ita-logo.jpeg" alt="ITA seal"
               style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Below seal: small "INDIANA TOWNSHIP ASSOCIATION" subhead */}
      <div style={{
        position: "absolute", top: 340, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
        fontSize: 14, letterSpacing: "8px", color: NAVY, textTransform: "uppercase",
      }}>
        Indiana&nbsp;&nbsp;Township&nbsp;&nbsp;Association
      </div>
      <div style={{ position: "absolute", top: 362, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <OrnamentalRule width={340} color={NAVY} gold={GOLD} />
      </div>

      {/* Body */}
      <div style={{
        position: "absolute", top: 392, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
        fontSize: 20, color: "#3a3a3a",
      }}>
        This certificate is proudly presented to
      </div>

      {/* Recipient name — copperplate script */}
      <div style={{
        position: "absolute", top: 422, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Pinyon Script', cursive",
        fontSize: 84, color: NAVY, lineHeight: 1.1,
        letterSpacing: "1px", textShadow: "0 1px 0 rgba(184,146,67,0.18)",
        whiteSpace: "nowrap",
      }}
        data-field="recipient_name"
      >
        {data.recipientName}
      </div>

      {/* thin gold rule under name */}
      <div style={{ position: "absolute", top: 540, left: "50%", transform: "translateX(-50%)", display: "flex" }}>
        <svg width="540" height="6" viewBox="0 0 540 6">
          <line x1="20" y1="3" x2="520" y2="3" stroke={GOLD} strokeWidth="0.8" />
          <circle cx="270" cy="3" r="2" fill={NAVY} />
          <line x1="0" y1="3" x2="14" y2="3" stroke={NAVY} strokeWidth="1.2" />
          <line x1="526" y1="3" x2="540" y2="3" stroke={NAVY} strokeWidth="1.2" />
        </svg>
      </div>

      <div style={{
        position: "absolute", top: 558, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Cormorant Garamond', serif", fontSize: 19, color: "#3a3a3a",
      }}>
        of{" "}
        <span style={{ fontWeight: 600, color: NAVY }} data-field="township">{data.township}</span>
        ,&nbsp;
        <span style={{ fontWeight: 600, color: NAVY }} data-field="county">{data.county}</span>
        , for the successful completion of
      </div>

      {/* Course name */}
      <div style={{
        position: "absolute", top: 594, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
        fontStyle: "italic", fontSize: 30, color: NAVY,
        padding: "0 80px",
      }}
        data-field="course_name"
      >
        {data.courseName}
      </div>

      {/* meta strip: HOURS · METHOD · DATE */}
      <div style={{
        position: "absolute", top: 648, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 30,
      }}>
        {showSprigs && <Sprig size={22} color={NAVY} rotate={-90} />}
        <MetaItem label="Training Hours"   value={data.hours}  navy={NAVY} gold={GOLD} field="hours"  width={140} />
        <MetaDot gold={GOLD} />
        <MetaItem label="Delivery Method"  value={data.method} navy={NAVY} gold={GOLD} field="method" width={170} />
        <MetaDot gold={GOLD} />
        <MetaItem label="Completion Date"  value={data.date}   navy={NAVY} gold={GOLD} field="date"   width={200} />
        {showSprigs && <Sprig size={22} color={NAVY} rotate={90} />}
      </div>

      {/* Signatures row */}
      <SignatureRow sigs={sigs} navy={NAVY} gold={GOLD} />

      {/* IDs at bottom */}
      <div style={{
        position: "absolute", bottom: 50, left: 0, right: 0, textAlign: "center",
        fontFamily: "'Cutive Mono', 'Courier New', monospace",
        fontSize: 10, color: "#666", letterSpacing: "2px",
      }}>
        <span data-field="course_id">COURSE&nbsp;ID&nbsp;·&nbsp;{data.courseId}</span>
        <span style={{ color: GOLD, margin: "0 14px" }}>◆</span>
        <span data-field="credential_id">CREDENTIAL&nbsp;ID&nbsp;·&nbsp;{data.credentialId}</span>
      </div>
    </div>
  );
};

const MetaItem = ({ label, value, navy, gold, field, width = 130 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: width }}>
    <div style={{
      fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
      fontSize: 10, color: "#7a7a7a", letterSpacing: "3px",
      textTransform: "uppercase", marginBottom: 4, whiteSpace: "nowrap",
    }}>{label}</div>
    <div style={{
      fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
      fontSize: 22, color: navy, lineHeight: 1, whiteSpace: "nowrap",
    }} data-field={field}>{value}</div>
  </div>
);

const MetaDot = ({ gold }) => (
  <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold, opacity: 0.7 }} />
);

const SignatureRow = ({ sigs, navy, gold }) => {
  const count = sigs.length;
  // Symmetric distribution across the page (no verify-seal to dodge anymore).
  const positions = count === 1
    ? [{ left: 410, top: 700, width: 280 }]
    : count === 2
      ? [{ left: 200, top: 700, width: 260 }, { left: 640, top: 700, width: 260 }]
      : [{ left: 110, top: 700, width: 240 }, { left: 430, top: 700, width: 240 }, { left: 750, top: 700, width: 240 }];

  return (
    <>
      {sigs.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: positions[i].left, top: positions[i].top, width: positions[i].width }}>
          <SignaturePlaceholder width={positions[i].width - 30} height={44} color={navy} seed={i} />
          <div style={{
            borderTop: `1px solid ${navy}`, paddingTop: 5, marginTop: -4,
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 16,
              color: navy, letterSpacing: "0.5px", whiteSpace: "nowrap",
            }} data-field={`signer_${i + 1}_name`}>{s.name}</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 10,
              color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap",
            }} data-field={`signer_${i + 1}_title`}>{s.title}</div>
          </div>
        </div>
      ))}
    </>
  );
};
