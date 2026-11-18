import React from "react";

/**
 * Back Pocket Mysteries social card templates (1080x1350, Instagram/Facebook 4:5).
 * Eight cohesive templates sharing one design system (palette, type scale, logo, margins).
 * The route picks a template by publish order so consecutive posts never repeat.
 */

export const TEMPLATE_COUNT = 8;

export type CardData = {
  bgSrc: string;
  title: string;
  category?: string | null;
  stat?: { value: string; label: string } | null;
};

const C = {
  pink: "#fe04c6",
  blue: "#0d00ff",
  purple: "#e88aff",
  babyBlue: "#a1e0ff",
  charcoal: "#1e191c",
  ink: "#1a1a1a",
  paper: "#f7f7f5",
  white: "#ffffff",
};
const W = 1080;
const H = 1350;
const M = 72; // outer margin
const FONT = "Montserrat";

// ---------- helpers ----------
function splitTitle(title: string) {
  const i = title.indexOf(":");
  if (i > 8 && i < title.length - 8) {
    return { head: title.slice(0, i).trim(), sub: title.slice(i + 1).trim() };
  }
  return { head: title.trim(), sub: "" };
}

function headSize(text: string, base: number) {
  const n = text.length;
  if (n > 70) return Math.round(base * 0.68);
  if (n > 50) return Math.round(base * 0.8);
  if (n > 32) return Math.round(base * 0.9);
  return base;
}

function categoryColor(category?: string | null) {
  const c = (category || "").toLowerCase();
  if (c.includes("guide") || c.includes("host")) return C.pink;
  if (c.includes("theme") || c.includes("trend")) return C.blue;
  if (c.includes("party") || c.includes("idea")) return C.purple;
  if (c.includes("mystery") || c.includes("clue")) return C.pink;
  return C.pink;
}

function Logo({ dark = false, size = 32 }: { dark?: boolean; size?: number }) {
  return (
    <div style={{ display: "flex", fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -1, textTransform: "uppercase" }}>
      <span style={{ color: dark ? C.ink : C.white }}>Back Pocket&nbsp;</span>
      <span style={{ color: C.pink }}>Mysteries</span>
    </div>
  );
}

function Pill({ text, bg, color = C.white, size = 22 }: { text: string; bg: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        backgroundColor: bg,
        color,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 2,
        textTransform: "uppercase",
        padding: "10px 22px",
        borderRadius: 999,
      }}
    >
      {text}
    </div>
  );
}

function Photo({ src, style }: { src: string; style: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ position: "absolute", objectFit: "cover", ...style }} />;
}

function Circle({ size, color, left, top, opacity = 1 }: { size: number; color: string; left: number; top: number; opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        opacity,
        display: "flex",
      }}
    />
  );
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

// ---------- 1. Editorial: full-bleed photo, soft dark fade, headline bottom-left ----------
function Editorial({ bgSrc, title, category }: CardData) {
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
            "linear-gradient(180deg, rgba(30,25,28,0.4) 0%, rgba(30,25,28,0) 22%, rgba(30,25,28,0) 42%, rgba(30,25,28,0.9) 72%, rgba(30,25,28,0.98) 100%)",
        }}
      />
      <Circle size={320} color={C.pink} left={W - 170} top={-150} opacity={0.9} />
      <div style={{ position: "absolute", left: M, top: M, display: "flex" }}>
        <Logo />
      </div>
      <div style={{ position: "absolute", left: M, right: M, bottom: M, display: "flex", flexDirection: "column" }}>
        <Pill text={label(category)} bg={C.pink} />
        <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: headSize(head, 76), lineHeight: 1.08, marginTop: 28 }}>
          {head}
        </div>
        {sub && (
          <div style={{ display: "flex", color: "rgba(255,255,255,0.84)", fontWeight: 800, fontSize: 30, lineHeight: 1.35, marginTop: 20 }}>
            {sub}
          </div>
        )}
        <div style={{ display: "flex", height: 2, backgroundColor: "rgba(255,255,255,0.35)", marginTop: 36, marginBottom: 22 }} />
        <div style={{ display: "flex", color: C.white, fontWeight: 800, fontSize: 26 }}>backpocketmysteries.com</div>
      </div>
    </div>
  );
}

// ---------- 2. Split card (light): framed photo top, clean text panel ----------
function SplitLight({ bgSrc, title, category, stat }: CardData) {
  const { head, sub } = splitTitle(title);
  const accent = categoryColor(category);
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      <Photo src={bgSrc} style={{ left: M, top: M, width: W - M * 2, height: 700, borderRadius: 28 }} />
      <Circle size={96} color={C.pink} left={M + 36} top={M + 700 - 48} />
      <div style={{ position: "absolute", left: M, right: M, top: M + 700 + 80, bottom: M, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: accent === C.purple ? C.pink : accent, fontWeight: 800, fontSize: 24, letterSpacing: 2 }}>
          {label(category)}
        </div>
        <div style={{ display: "flex", color: C.ink, fontWeight: 900, fontSize: headSize(head, 64), lineHeight: 1.1, marginTop: 18 }}>
          {head}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", color: C.blue, fontWeight: 800, fontSize: 28, maxWidth: 600, lineHeight: 1.3 }}>
            {stat ? `${stat.value} ${stat.label}` : sub ? sub.slice(0, 70) + (sub.length > 70 ? "…" : "") : "Read the full guide"}
          </div>
          <Logo dark size={28} />
        </div>
      </div>
    </div>
  );
}

// ---------- 3. Stat (dark): big number over tinted photo ----------
function StatDark({ bgSrc, title, category, stat }: CardData) {
  const { head } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.charcoal }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: H }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", backgroundColor: "rgba(30,25,28,0.84)" }} />
      <Circle size={360} color={C.blue} left={-200} top={420} opacity={0.35} />
      <Circle size={300} color={C.pink} left={W - 140} top={H - 420} opacity={0.35} />
      <div style={{ position: "absolute", left: M, right: M, top: M, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo />
        <div style={{ display: "flex", color: "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>{label(category)}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: M,
          right: M,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {stat ? (
          <>
            <div style={{ display: "flex", color: C.pink, fontWeight: 900, fontSize: stat.value.length > 7 ? 150 : 200, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: 48, lineHeight: 1.2, marginTop: 24, maxWidth: 860, justifyContent: "center" }}>
              {stat.label}
            </div>
            <div style={{ display: "flex", width: 160, height: 4, backgroundColor: C.pink, marginTop: 44, marginBottom: 40, borderRadius: 4 }} />
            <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 32, lineHeight: 1.35, maxWidth: 820, justifyContent: "center" }}>
              {head}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", color: C.pink, fontWeight: 900, fontSize: 30, letterSpacing: 3 }}>NEW ON THE GAZETTE</div>
            <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: headSize(head, 84), lineHeight: 1.1, marginTop: 28, justifyContent: "center" }}>
              {head}
            </div>
          </>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: M, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", color: C.white, fontWeight: 800, fontSize: 24, border: "2px solid rgba(255,255,255,0.7)", borderRadius: 999, padding: "14px 32px" }}>
          Read the article → backpocketmysteries.com
        </div>
      </div>
    </div>
  );
}

// ---------- 4. Colour block: photo top, solid brand panel bottom, bubble on the seam ----------
function ColourBlock({ bgSrc, title, category }: CardData) {
  const { head, sub } = splitTitle(title);
  const panel = categoryColor(category) === C.purple ? C.charcoal : categoryColor(category);
  const seam = 760;
  return (
    <div style={{ ...frame, backgroundColor: panel }}>
      <Photo src={bgSrc} style={{ left: 0, top: 0, width: W, height: seam }} />
      <Circle size={150} color={C.babyBlue} left={W - M - 150} top={seam - 75} />
      <div style={{ position: "absolute", left: M, top: M, display: "flex" }}>
        <Pill text={label(category)} bg="rgba(30,25,28,0.82)" />
      </div>
      <div style={{ position: "absolute", left: M, right: M, top: seam + 70, bottom: M, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: headSize(head, 66), lineHeight: 1.1, maxWidth: 820 }}>
          {head}
        </div>
        {sub && (
          <div style={{ display: "flex", color: "rgba(255,255,255,0.88)", fontWeight: 800, fontSize: 26, lineHeight: 1.35, marginTop: 18, maxWidth: 860 }}>
            {sub}
          </div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: C.white, fontWeight: 800, fontSize: 24 }}>New on the blog →</div>
          <Logo size={28} />
        </div>
      </div>
    </div>
  );
}

// ---------- 5. Framed poster: photo in a paper frame, floating headline card ----------
function FramedPoster({ bgSrc, title, category }: CardData) {
  const { head } = splitTitle(title);
  const accent = categoryColor(category);
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      <Photo src={bgSrc} style={{ left: 48, top: 48, width: W - 96, height: H - 96, borderRadius: 24 }} />
      <div
        style={{
          position: "absolute",
          left: 48,
          top: 48,
          width: W - 96,
          height: H - 96,
          borderRadius: 24,
          display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 25%)",
        }}
      />
      <div style={{ position: "absolute", left: 96, top: 96, display: "flex" }}>
        <Logo />
      </div>
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 96,
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.white,
          borderRadius: 24,
          padding: "44px 48px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          borderLeft: `14px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", color: C.pink, fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>{label(category)}</div>
        <div style={{ display: "flex", color: C.ink, fontWeight: 900, fontSize: headSize(head, 58), lineHeight: 1.12, marginTop: 16 }}>
          {head}
        </div>
        <div style={{ display: "flex", color: "#6b7280", fontWeight: 800, fontSize: 22, marginTop: 22 }}>
          Read more at backpocketmysteries.com
        </div>
      </div>
    </div>
  );
}

// ---------- 6. Bubble portrait: big type on paper, photo inside a large brand bubble ----------
function BubblePortrait({ bgSrc, title, category }: CardData) {
  const { head } = splitTitle(title);
  const d = 760;
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      <Circle size={d + 70} color={C.pink} left={W - d + 40 - 35} top={H - d + 40 - 35} />
      <Photo src={bgSrc} style={{ left: W - d + 40, top: H - d + 40, width: d, height: d, borderRadius: "50%" }} />
      <Circle size={130} color={C.babyBlue} left={W - d - 40} top={H - d - 10} />
      <Circle size={70} color={C.blue} left={W - d + 80} top={H - d - 80} />
      <div style={{ position: "absolute", left: M, top: M, right: M, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo dark />
        <div style={{ display: "flex", color: C.pink, fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>{label(category)}</div>
      </div>
      <div style={{ position: "absolute", left: M, top: 200, width: 820, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 90, height: 8, backgroundColor: C.pink, borderRadius: 8, marginBottom: 34 }} />
        <div style={{ display: "flex", color: C.ink, fontWeight: 900, fontSize: headSize(head, 80), lineHeight: 1.06 }}>{head}</div>
      </div>
      <div style={{ position: "absolute", left: M, bottom: M, display: "flex", color: C.ink, fontWeight: 800, fontSize: 24 }}>
        New article →
      </div>
    </div>
  );
}

// ---------- 7. Stat (light): big brand number, photo strip ----------
function StatLight({ bgSrc, title, category, stat }: CardData) {
  const { head } = splitTitle(title);
  return (
    <div style={{ ...frame, backgroundColor: C.paper }}>
      <div style={{ position: "absolute", left: M, right: M, top: M, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo dark />
        <Pill text={label(category)} bg={C.blue} size={20} />
      </div>
      <div style={{ position: "absolute", left: M, right: M, top: 210, display: "flex", flexDirection: "column" }}>
        {stat ? (
          <>
            <div style={{ display: "flex", color: C.pink, fontWeight: 900, fontSize: stat.value.length > 7 ? 140 : 180, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ display: "flex", color: C.ink, fontWeight: 900, fontSize: 44, lineHeight: 1.2, marginTop: 18, maxWidth: 900 }}>
              {stat.label}
            </div>
            <div style={{ display: "flex", color: "#6b7280", fontWeight: 800, fontSize: 28, lineHeight: 1.35, marginTop: 26, maxWidth: 900 }}>
              {head}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", width: 90, height: 8, backgroundColor: C.pink, borderRadius: 8, marginBottom: 30 }} />
            <div style={{ display: "flex", color: C.ink, fontWeight: 900, fontSize: headSize(head, 76), lineHeight: 1.08 }}>{head}</div>
          </>
        )}
      </div>
      <Photo src={bgSrc} style={{ left: M, right: M, bottom: M + 90, width: W - M * 2, height: 420, borderRadius: 28 }} />
      <Circle size={110} color={C.pink} left={W - M - 80} top={H - M - 90 - 420 - 50} />
      <div style={{ position: "absolute", left: M, right: M, bottom: M, display: "flex", justifyContent: "space-between", color: C.ink, fontWeight: 800, fontSize: 24 }}>
        <span>Read the full article</span>
        <span>backpocketmysteries.com</span>
      </div>
    </div>
  );
}

// ---------- 8. Magazine cover: masthead, headline at top over photo ----------
function MagazineCover({ bgSrc, title, category }: CardData) {
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
            "linear-gradient(180deg, rgba(30,25,28,0.96) 0%, rgba(30,25,28,0.82) 38%, rgba(30,25,28,0) 62%, rgba(30,25,28,0) 82%, rgba(30,25,28,0.7) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: M, right: M, top: M, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: 26, letterSpacing: 6 }}>THE MYSTERY GAZETTE</div>
          <div style={{ display: "flex", width: 22, height: 22, borderRadius: "50%", backgroundColor: C.pink }} />
        </div>
        <div style={{ display: "flex", height: 3, backgroundColor: C.pink, marginTop: 22, marginBottom: 40 }} />
        <div style={{ display: "flex", color: C.babyBlue, fontWeight: 800, fontSize: 24, letterSpacing: 2 }}>{label(category)}</div>
        <div style={{ display: "flex", color: C.white, fontWeight: 900, fontSize: headSize(head, 80), lineHeight: 1.06, marginTop: 18 }}>
          {head}
        </div>
        {sub && (
          <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 28, lineHeight: 1.35, marginTop: 20, maxWidth: 900 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: M, right: M, bottom: M, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", color: C.white, fontWeight: 800, fontSize: 24 }}>Read now at backpocketmysteries.com</div>
        <Logo size={28} />
      </div>
    </div>
  );
}

const TEMPLATES = [Editorial, SplitLight, StatDark, ColourBlock, FramedPoster, BubblePortrait, StatLight, MagazineCover];

export function getCardElement(data: CardData, templateIndex: number) {
  const T = TEMPLATES[((templateIndex % TEMPLATE_COUNT) + TEMPLATE_COUNT) % TEMPLATE_COUNT];
  return <T {...data} />;
}
