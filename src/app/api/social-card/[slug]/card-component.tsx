import React from "react";

/**
 * Back Pocket Mysteries / Back Pocket Games social card templates (1080x1350, Instagram/Facebook 4:5).
 * Eight cohesive templates sharing the Back Pocket brand system (palette, bold uppercase type scale,
 * official horizontal logo, pill badges, and circular arrow CTAs).
 * The route picks a template by publish order so consecutive posts never repeat.
 */

export const TEMPLATE_COUNT = 8;

export const TEMPLATE_NAMES = [
  "Noir Editorial",
  "Framed Bento",
  "Stat Spotlight (Dark)",
  "Brand Colour Block",
  "Floating Case Card",
  "Circle Spotlight",
  "Stat Editorial (Light)",
  "Mystery Gazette Cover",
];

export type CardData = {
  bgSrc: string;
  title: string;
  category?: string | null;
  stat?: { value: string; label: string } | null;
  ctaText?: string | null;
  kickerText?: string | null;
  logoColorSrc?: string;
  logoWhiteSrc?: string;
};

const C = {
  pink: "#fe04c6",
  blue: "#0d00ff",
  purple: "#e88aff",
  babyBlue: "#a1e0ff",
  charcoal: "#141115",
  ink: "#1e191c",
  paper: "#f6f5f2",
  white: "#ffffff",
  muted: "#646068",
};

const W = 1080;
const H = 1350;
const M = 68; // outer margin
const FONT = "Montserrat";

// ---------- helpers ----------
function splitTitle(title: string) {
  const i = title.indexOf(":");
  if (i > 6 && i < title.length - 6) {
    return { head: title.slice(0, i).trim(), sub: title.slice(i + 1).trim() };
  }
  return { head: title.trim(), sub: "" };
}

function headSize(text: string, base: number) {
  const n = text.length;
  if (n > 72) return Math.round(base * 0.66);
  if (n > 54) return Math.round(base * 0.76);
  if (n > 38) return Math.round(base * 0.86);
  if (n > 26) return Math.round(base * 0.94);
  return base;
}

function categoryColor(category?: string | null) {
  const c = (category || "").toLowerCase();
  if (c.includes("theme") || c.includes("trend") || c.includes("pack")) return C.blue;
  if (c.includes("party") || c.includes("idea") || c.includes("menu")) return C.pink;
  if (c.includes("guide") || c.includes("host") || c.includes("tip")) return C.pink;
  return C.pink;
}

function BrandLogo({
  dark = false,
  height = 50,
  logoColorSrc,
  logoWhiteSrc,
}: {
  dark?: boolean;
  height?: number;
  logoColorSrc?: string;
  logoWhiteSrc?: string;
}) {
  const src = dark ? logoColorSrc : logoWhiteSrc;
  const width = Math.round(height * 3.76);
  if (src) {
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Back Pocket Games"
          width={width}
          height={height}
          style={{ width, height, objectFit: "contain" }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: Math.round(height * 0.62),
        letterSpacing: -1,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: dark ? C.ink : C.white }}>BACK POCKET&nbsp;</span>
      <span style={{ color: dark ? C.pink : C.white }}>GAMES</span>
    </div>
  );
}

function Pill({
  text,
  bg,
  color = C.white,
  size = 20,
  border,
}: {
  text: string;
  bg: string;
  color?: string;
  size?: number;
  border?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        alignItems: "center",
        backgroundColor: bg,
        color,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        padding: "11px 24px",
        borderRadius: 999,
        border: border || "none",
      }}
    >
      {text}
    </div>
  );
}

function ArrowCircle({
  bg = C.pink,
  color = C.white,
  size = 54,
}: {
  bg?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: bg,
        color,
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: Math.round(size * 0.48),
      }}
    >
      →
    </div>
  );
}

function Photo({ src, style }: { src: string; style: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ position: "absolute", objectFit: "cover", ...style }} />;
}

const frame: React.CSSProperties = {
  display: "flex",
  width: W,
  height: H,
  position: "relative",
  overflow: "hidden",
  fontFamily: FONT,
};

const label = (category?: string | null) => (category || "Hosting Guide").toUpperCase();

// ---------- 1. Noir Editorial: full-bleed photo, cinematic dark fade, headline bottom-left ----------
function Editorial({ bgSrc, title, category, stat, ctaText, kickerText, logoWhiteSrc, logoColorSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.charcoal }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: H }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(20,17,21,0.72) 0%, rgba(20,17,21,0.12) 22%, rgba(20,17,21,0.15) 45%, rgba(20,17,21,0.88) 72%, rgba(20,17,21,0.98) 100%)",
        }}
      />
      {/* Top Bar */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLogo height={52} logoWhiteSrc={logoWhiteSrc} logoColorSrc={logoColorSrc} />
        <Pill
          text={kickerText || "THE MYSTERY GAZETTE"}
          bg="rgba(20,17,21,0.68)"
          color={C.white}
          size={17}
          border="2px solid rgba(255,255,255,0.24)"
        />
      </div>

      {/* Bottom Editorial Block */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: M,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Pill text={label(category)} bg={C.pink} size={20} />
        <div
          style={{
            display: "flex",
            color: C.white,
            fontWeight: 900,
            fontSize: headSize(head, 74),
            lineHeight: 1.0,
            letterSpacing: -1.8,
            textTransform: "uppercase",
            marginTop: 26,
          }}
        >
          {head}
        </div>
        {(sub || stat) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 8,
                height: 44,
                borderRadius: 99,
                backgroundColor: C.pink,
                marginRight: 20,
              }}
            />
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.88)",
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1.3,
              }}
            >
              {sub || `${stat?.value} ${stat?.label}`}
            </div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            height: 2,
            backgroundColor: "rgba(255,255,255,0.22)",
            marginTop: 34,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              color: C.white,
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: 2.5,
              textTransform: "uppercase",
            }}
          >
            BACKPOCKETMYSTERIES.COM
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                color: C.babyBlue,
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginRight: 16,
              }}
            >
              {ctaText || "READ GUIDE"}
            </div>
            <ArrowCircle bg={C.pink} size={50} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 2. Framed Bento (light): framed photo top with badge overlay, crisp editorial bottom ----------
function SplitLight({ bgSrc, title, category, stat, ctaText, logoColorSrc, logoWhiteSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  const accent = categoryColor(category);
  const photoH = 660;
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      {/* Framed Photo Container */}
      <div
        style={{
          position: "absolute",
          left: M,
          top: M,
          width: W - M * 2,
          height: photoH,
          borderRadius: 36,
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 24px 50px rgba(20,17,21,0.16)",
        }}
      >
        <Photo
          src={bgSrc}
          style={{ left: 0, top: 0, width: W - M * 2, height: photoH, borderRadius: 36 }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: W - M * 2,
            height: photoH,
            borderRadius: 36,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, rgba(20,17,21,0.1) 0%, rgba(20,17,21,0) 55%, rgba(20,17,21,0.65) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 32,
            bottom: 28,
            right: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pill text={label(category)} bg={accent} size={19} />
          {stat && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(20,17,21,0.88)",
                border: "2px solid rgba(255,255,255,0.25)",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              <span style={{ color: C.pink, fontWeight: 900, fontSize: 24, marginRight: 10 }}>
                {stat.value}
              </span>
              <span
                style={{
                  color: C.white,
                  fontWeight: 800,
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {stat.label.length > 28 ? stat.label.slice(0, 28) + "…" : stat.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Text Panel */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M + photoH + 44,
          bottom: M,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            color: C.ink,
            fontWeight: 900,
            fontSize: headSize(head, 64),
            lineHeight: 1.02,
            letterSpacing: -1.6,
            textTransform: "uppercase",
          }}
        >
          {head}
        </div>
        {(sub || stat) && (
          <div
            style={{
              display: "flex",
              color: C.muted,
              fontWeight: 800,
              fontSize: 27,
              lineHeight: 1.32,
              marginTop: 18,
              maxWidth: 880,
            }}
          >
            {sub
              ? sub
              : stat
              ? `${stat.value} ${stat.label}`
              : "Step-by-step hosting blueprint & custom party kit guide."}
          </div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <div
          style={{
            display: "flex",
            height: 2,
            backgroundColor: "rgba(20,17,21,0.1)",
            marginBottom: 24,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BrandLogo dark height={50} logoColorSrc={logoColorSrc} logoWhiteSrc={logoWhiteSrc} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: C.ink,
              color: C.white,
              borderRadius: 999,
              padding: "14px 28px",
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            <span>{ctaText || "READ FULL GUIDE"}&nbsp;&nbsp;→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 3. Stat Spotlight (dark): big number in sleek glass card over noir photo ----------
function StatDark({ bgSrc, title, category, stat, ctaText, kickerText, logoWhiteSrc, logoColorSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.charcoal }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: H }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          display: "flex",
          backgroundImage:
            "linear-gradient(165deg, rgba(20,17,21,0.92) 0%, rgba(20,17,21,0.78) 50%, rgba(20,17,21,0.95) 100%)",
        }}
      />
      {/* Top Bar */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLogo height={50} logoWhiteSrc={logoWhiteSrc} logoColorSrc={logoColorSrc} />
        <Pill text={label(category)} bg={C.pink} size={19} />
      </div>

      {/* Center Frosted Stat Card */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: 210,
          bottom: 195,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "rgba(20, 17, 21, 0.72)",
          border: "3px solid rgba(254, 4, 198, 0.55)",
          borderRadius: 40,
          padding: "56px 60px",
          boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
        }}
      >
        {stat ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: C.babyBlue,
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {kickerText || "KEY PARTY INSIGHT"}
            </div>
            <div
              style={{
                display: "flex",
                color: C.pink,
                fontWeight: 900,
                fontSize: stat.value.length > 7 ? 136 : 176,
                lineHeight: 0.95,
                letterSpacing: -3,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                display: "flex",
                color: C.white,
                fontWeight: 900,
                fontSize: 42,
                lineHeight: 1.18,
                marginTop: 22,
                textTransform: "uppercase",
                letterSpacing: -0.5,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                display: "flex",
                width: 120,
                height: 6,
                backgroundColor: C.pink,
                marginTop: 38,
                marginBottom: 34,
                borderRadius: 99,
              }}
            />
            <div
              style={{
                display: "flex",
                color: "rgba(255,255,255,0.86)",
                fontWeight: 800,
                fontSize: 30,
                lineHeight: 1.3,
              }}
            >
              {head}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: C.pink,
                fontWeight: 900,
                fontSize: 24,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {kickerText || "NEW ON THE MYSTERY GAZETTE"}
            </div>
            <div
              style={{
                display: "flex",
                color: C.white,
                fontWeight: 900,
                fontSize: headSize(head, 76),
                lineHeight: 1.02,
                letterSpacing: -1.5,
                textTransform: "uppercase",
                marginTop: 24,
              }}
            >
              {head}
            </div>
            {sub && (
              <div
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.82)",
                  fontWeight: 800,
                  fontSize: 28,
                  lineHeight: 1.35,
                  marginTop: 22,
                }}
              >
                {sub}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA Bar */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}
        >
          BACKPOCKETMYSTERIES.COM
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: C.pink,
            color: C.white,
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: 2,
            textTransform: "uppercase",
            borderRadius: 999,
            padding: "16px 32px",
          }}
        >
          {ctaText || "READ THE FULL GUIDE"}&nbsp;&nbsp;→
        </div>
      </div>
    </div>
  );
}

// ---------- 4. Brand Colour Block: photo top, bold vibrant brand panel bottom ----------
function ColourBlock({ bgSrc, title, category, stat, ctaText, logoWhiteSrc, logoColorSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  const seam = 710;
  return (
    <div style={{ ...frame, backgroundColor: C.pink }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: seam }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: seam,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(20,17,21,0.55) 0%, rgba(20,17,21,0) 28%, rgba(20,17,21,0) 70%, rgba(254,4,198,0.35) 100%)",
        }}
      />
      {/* Top Badge */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pill
          text={label(category)}
          bg="rgba(20,17,21,0.88)"
          color={C.white}
          size={19}
          border="2px solid rgba(255,255,255,0.2)"
        />
        {stat && (
          <Pill
            text={`${stat.value} ${stat.label.split(" ").slice(0, 3).join(" ")}`}
            bg={C.blue}
            color={C.white}
            size={18}
          />
        )}
      </div>

      {/* Seam Divider Strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: seam - 6,
          width: W,
          height: 12,
          backgroundColor: C.charcoal,
          display: "flex",
        }}
      />

      {/* Bottom Brand Panel */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: seam + 48,
          bottom: M,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            color: C.white,
            fontWeight: 900,
            fontSize: headSize(head, 68),
            lineHeight: 1.0,
            letterSpacing: -1.6,
            textTransform: "uppercase",
          }}
        >
          {head}
        </div>
        {(sub || stat) && (
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 800,
              fontSize: 27,
              lineHeight: 1.32,
              marginTop: 20,
              maxWidth: 900,
            }}
          >
            {sub || `${stat?.value} — ${stat?.label}`}
          </div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: C.charcoal,
              color: C.white,
              borderRadius: 999,
              padding: "14px 28px",
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {ctaText || "NEW ON THE BLOG"}&nbsp;&nbsp;→
          </div>
          <BrandLogo height={52} logoWhiteSrc={logoWhiteSrc} logoColorSrc={logoColorSrc} />
        </div>
      </div>
    </div>
  );
}

// ---------- 5. Floating Case Card: framed photo with floating white editorial card ----------
function FramedPoster({ bgSrc, title, category, stat, ctaText, logoWhiteSrc, logoColorSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  const accent = categoryColor(category);
  return (
    <div style={{ ...frame, backgroundColor: C.charcoal }}>
      <Photo
        src={bgSrc}
        style={{ left: 40, top: 40, width: W - 80, height: H - 80, borderRadius: 36 }}
      />
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          width: W - 80,
          height: H - 80,
          borderRadius: 36,
          display: "flex",
          border: "3px solid rgba(255,255,255,0.16)",
          backgroundImage:
            "linear-gradient(180deg, rgba(20,17,21,0.65) 0%, rgba(20,17,21,0) 28%, rgba(20,17,21,0.2) 60%, rgba(20,17,21,0.75) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 84,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLogo height={50} logoWhiteSrc={logoWhiteSrc} logoColorSrc={logoColorSrc} />
        <Pill text={label(category)} bg={accent} size={18} />
      </div>

      {/* Floating White Editorial Card (uses inner pill bar instead of borderLeft to avoid corner clipping) */}
      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          bottom: 84,
          display: "flex",
          flexDirection: "row",
          backgroundColor: C.white,
          borderRadius: 32,
          padding: "44px 48px",
          boxShadow: "0 28px 65px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 12,
            borderRadius: 999,
            backgroundColor: accent,
            marginRight: 32,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              color: C.pink,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 2.5,
              textTransform: "uppercase",
            }}
          >
            {stat ? `${stat.value} • ${label(category)}` : label(category)}
          </div>
          <div
            style={{
              display: "flex",
              color: C.ink,
              fontWeight: 900,
              fontSize: headSize(head, 58),
              lineHeight: 1.04,
              letterSpacing: -1.4,
              textTransform: "uppercase",
              marginTop: 14,
            }}
          >
            {head}
          </div>
          {sub && (
            <div
              style={{
                display: "flex",
                color: C.muted,
                fontWeight: 800,
                fontSize: 24,
                lineHeight: 1.3,
                marginTop: 14,
              }}
            >
              {sub}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 26,
              paddingTop: 20,
              borderTop: "2px solid rgba(20,17,21,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                color: C.ink,
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {ctaText ? `${ctaText} • BACKPOCKETMYSTERIES.COM` : "BACKPOCKETMYSTERIES.COM"}
            </div>
            <ArrowCircle bg={C.pink} size={46} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 6. Circle Spotlight: bold uppercase type on warm paper, photo inside vibrant brand ring ----------
function BubblePortrait({ bgSrc, title, category, stat, ctaText, logoColorSrc, logoWhiteSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  const d = 690;
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      {/* Outer Pink Ring + Circular Photo */}
      <div
        style={{
          position: "absolute",
          left: W - d - 36,
          top: H - d - 36,
          width: d + 48,
          height: d + 48,
          borderRadius: "50%",
          backgroundColor: C.pink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 24px 60px rgba(254,4,198,0.28)",
        }}
      />
      <Photo
        src={bgSrc}
        style={{
          left: W - d - 12,
          top: H - d - 12,
          width: d,
          height: d,
          borderRadius: "50%",
        }}
      />

      {/* Top Header */}
      <div
        style={{
          position: "absolute",
          left: M,
          top: M,
          right: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLogo dark height={50} logoColorSrc={logoColorSrc} logoWhiteSrc={logoWhiteSrc} />
        <Pill text={label(category)} bg={C.pink} size={19} />
      </div>

      {/* Headline Block */}
      <div
        style={{
          position: "absolute",
          left: M,
          top: 190,
          width: 900,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 10,
            backgroundColor: C.pink,
            borderRadius: 99,
            marginBottom: 28,
          }}
        />
        <div
          style={{
            display: "flex",
            color: C.ink,
            fontWeight: 900,
            fontSize: headSize(head, 74),
            lineHeight: 0.98,
            letterSpacing: -1.8,
            textTransform: "uppercase",
          }}
        >
          {head}
        </div>
        {(sub || stat) && (
          <div
            style={{
              display: "flex",
              color: C.muted,
              fontWeight: 800,
              fontSize: 27,
              lineHeight: 1.32,
              marginTop: 22,
              maxWidth: 680,
            }}
          >
            {sub || `${stat?.value} ${stat?.label}`}
          </div>
        )}
      </div>

      {/* Bottom Left CTA Stack */}
      <div
        style={{
          position: "absolute",
          left: M,
          bottom: M,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {stat && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: C.white,
              borderRadius: 24,
              padding: "22px 28px",
              marginBottom: 24,
              boxShadow: "0 14px 34px rgba(20,17,21,0.08)",
              border: "2px solid rgba(254,4,198,0.22)",
              maxWidth: 320,
            }}
          >
            <div style={{ display: "flex", color: C.pink, fontWeight: 900, fontSize: 48, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div
              style={{
                display: "flex",
                color: C.ink,
                fontWeight: 800,
                fontSize: 18,
                lineHeight: 1.25,
                marginTop: 8,
              }}
            >
              {stat.label}
            </div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: C.ink,
            color: C.white,
            borderRadius: 999,
            padding: "16px 30px",
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {ctaText || "READ ARTICLE"}&nbsp;&nbsp;→
        </div>
      </div>
    </div>
  );
}

// ---------- 7. Stat Editorial (light): big brand stat stacked cleanly above framed photo strip ----------
function StatLight({ bgSrc, title, category, stat, ctaText, logoColorSrc, logoWhiteSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLogo dark height={50} logoColorSrc={logoColorSrc} logoWhiteSrc={logoWhiteSrc} />
        <Pill text={label(category)} bg={C.blue} size={19} />
      </div>

      {/* Upper Content Block (wrapped in column flex container so Satori never lays fragments out horizontally) */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: 185,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {stat ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div
                style={{
                  display: "flex",
                  color: C.pink,
                  fontWeight: 900,
                  fontSize: stat.value.length > 7 ? 128 : 156,
                  lineHeight: 0.95,
                  letterSpacing: -3,
                }}
              >
                {stat.value}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                color: C.ink,
                fontWeight: 900,
                fontSize: 40,
                lineHeight: 1.15,
                letterSpacing: -0.8,
                textTransform: "uppercase",
                marginTop: 16,
                maxWidth: 920,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 10,
                  height: 36,
                  borderRadius: 99,
                  backgroundColor: C.pink,
                  marginRight: 16,
                }}
              />
              <div
                style={{
                  display: "flex",
                  color: C.muted,
                  fontWeight: 800,
                  fontSize: 26,
                  lineHeight: 1.3,
                  maxWidth: 880,
                }}
              >
                {head}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                width: 90,
                height: 10,
                backgroundColor: C.pink,
                borderRadius: 99,
                marginBottom: 26,
              }}
            />
            <div
              style={{
                display: "flex",
                color: C.ink,
                fontWeight: 900,
                fontSize: headSize(head, 72),
                lineHeight: 1.0,
                letterSpacing: -1.6,
                textTransform: "uppercase",
              }}
            >
              {head}
            </div>
            {sub && (
              <div
                style={{
                  display: "flex",
                  color: C.muted,
                  fontWeight: 800,
                  fontSize: 28,
                  lineHeight: 1.32,
                  marginTop: 18,
                }}
              >
                {sub}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Framed Photo */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: M + 84,
          width: W - M * 2,
          height: 460,
          borderRadius: 32,
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 20px 45px rgba(20,17,21,0.14)",
        }}
      >
        <Photo
          src={bgSrc}
          style={{ left: 0, top: 0, width: W - M * 2, height: 460, borderRadius: 32 }}
        />
      </div>

      {/* Footer Bar */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: C.ink,
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        <span>{ctaText || "READ THE FULL ARTICLE"} →</span>
        <span style={{ color: C.pink }}>BACKPOCKETMYSTERIES.COM</span>
      </div>
    </div>
  );
}

// ---------- 8. Mystery Gazette Cover: magazine masthead at top, clear center subject, frosted footer ----------
function MagazineCover({ bgSrc, title, category, stat, ctaText, kickerText, logoWhiteSrc, logoColorSrc }: CardData) {
  const { head, sub } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.charcoal }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: H }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(20,17,21,0.94) 0%, rgba(20,17,21,0.76) 34%, rgba(20,17,21,0.08) 56%, rgba(20,17,21,0.15) 78%, rgba(20,17,21,0.88) 100%)",
        }}
      />
      {/* Top Masthead */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: M,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              color: C.white,
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            {kickerText || "THE MYSTERY GAZETTE"}
          </div>
          <Pill text={label(category)} bg={C.pink} size={18} />
        </div>
        <div
          style={{
            display: "flex",
            height: 4,
            backgroundColor: C.pink,
            marginTop: 22,
            marginBottom: 32,
            borderRadius: 99,
          }}
        />
        <div
          style={{
            display: "flex",
            color: C.white,
            fontWeight: 900,
            fontSize: headSize(head, 76),
            lineHeight: 0.98,
            letterSpacing: -1.8,
            textTransform: "uppercase",
          }}
        >
          {head}
        </div>
        {(sub || stat) && (
          <div
            style={{
              display: "flex",
              color: C.babyBlue,
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1.32,
              marginTop: 18,
              maxWidth: 900,
            }}
          >
            {sub || `${stat?.value} — ${stat?.label}`}
          </div>
        )}
      </div>

      {/* Bottom Frosted Bar */}
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          bottom: M,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(20,17,21,0.84)",
          border: "2px solid rgba(255,255,255,0.2)",
          borderRadius: 28,
          padding: "22px 32px",
        }}
      >
        <BrandLogo height={46} logoWhiteSrc={logoWhiteSrc} logoColorSrc={logoColorSrc} />
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              color: C.white,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginRight: 16,
            }}
          >
            {ctaText || "BACKPOCKETMYSTERIES.COM"}
          </div>
          <ArrowCircle bg={C.pink} size={46} />
        </div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  Editorial,
  SplitLight,
  StatDark,
  ColourBlock,
  FramedPoster,
  BubblePortrait,
  StatLight,
  MagazineCover,
];

export function getCardElement(data: CardData, templateIndex: number) {
  const T = TEMPLATES[((templateIndex % TEMPLATE_COUNT) + TEMPLATE_COUNT) % TEMPLATE_COUNT];
  return <T {...data} />;
}
