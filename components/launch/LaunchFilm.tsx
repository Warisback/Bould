"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * 16:9 launch film in the style of a modern product reel: fast cuts between
 * black and white, glowing orange orbs and swooshes, small refined type, and
 * single UI pieces animated in isolation. One clock drives everything so it can
 * be rendered frame by frame. Sizes are cqw (percent of stage width).
 * ?rec=1 hides the progress bar, ?at=<s> freezes a frame (and exposes window.__filmSeek).
 */
export const FILM_SECONDS = 28;

const BRAND = "#fc4c02";
const INK = "#0b0b0c";
const RC = {
  brilliant: "#1fc7b6",
  great: "#4f9ef0",
  good: "#7cc04b",
  inaccuracy: "#f5c542",
  mistake: "#f28a2e",
  blunder: "#ec4b4b",
};
type RK = keyof typeof RC;
const SYM: Record<RK, string> = { brilliant: "!!", great: "!", good: "✓", inaccuracy: "?!", mistake: "?", blunder: "??" };

/* ---------------------------------- time ---------------------------------- */

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const expo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const inOut = (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
const p = (t: number, a: number, b: number, e = expo) => e(clamp((t - a) / (b - a)));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Hard-cut scene with a background. */
function Cut({ t, a, b, bg, children }: { t: number; a: number; b: number; bg: string; children: ReactNode }) {
  if (t < a || t >= b) return null;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
      {children}
    </div>
  );
}

function Center({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={style}>
      {children}
    </div>
  );
}

/** Words arrive one at a time, rising out of a soft blur. */
function Words({ t, at, text, step = 0.14, size, color, weight = 500, style }: { t: number; at: number; text: string; step?: number; size: number; color: string; weight?: number; style?: CSSProperties }) {
  return (
    <div style={{ fontSize: `${size}cqw`, color, fontWeight: weight, letterSpacing: "-0.02em", whiteSpace: "nowrap", ...style }}>
      {text.split(" ").map((w, i) => {
        const k = p(t, at + i * step, at + i * step + 0.55);
        return (
          <span key={i} className="inline-block" style={{ opacity: k, transform: `translateY(${(1 - k) * 0.6}em)`, filter: `blur(${(1 - k) * 0.25}em)`, marginRight: "0.25em" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

/** Typewriter with an orange caret. */
function Type({ t, at, text, cps = 24, caret = true }: { t: number; at: number; text: string; cps?: number; caret?: boolean }) {
  const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
  const blink = Math.floor(t * 2.2) % 2 === 0;
  return (
    <>
      {text.slice(0, n)}
      {caret && (
        <span className="inline-block align-[-0.12em]" style={{ width: "0.08em", height: "1.05em", marginLeft: "0.04em", background: BRAND, opacity: n < text.length || blink ? 1 : 0 }} />
      )}
    </>
  );
}

function Orb({ x, y, r, blur = 0, opacity = 1 }: { x: number; y: number; r: number; blur?: number; opacity?: number }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}cqw`,
        top: `${y}cqw`,
        width: `${r * 2}cqw`,
        height: `${r * 2}cqw`,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle at 38% 34%, #ffc08a 0%, #ff8a3d 22%, #fc4c02 52%, #c73a06 78%, #7a1d00 100%)",
        filter: `blur(${blur}cqw)`,
        opacity,
        boxShadow: "0 0 8cqw rgba(252,76,2,.35)",
      }}
    />
  );
}

/** A thick orange ribbon drawn along a path. */
function Swoosh({ d, draw, tail = 1, blur = 0, width = 2.6, style }: { d: string; draw: number; tail?: number; blur?: number; width?: number; style?: CSSProperties }) {
  const head = clamp(draw);
  const start = Math.max(0, head - tail);
  return (
    <svg viewBox="0 0 100 56.25" className="absolute inset-0 h-full w-full" style={{ filter: `blur(${blur}cqw)`, ...style }} aria-hidden>
      <defs>
        <linearGradient id="sw" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ff9a4a" />
          <stop offset="0.5" stopColor={BRAND} />
          <stop offset="1" stopColor="#ff7a2a" />
        </linearGradient>
      </defs>
      <path d={d} pathLength={1} fill="none" stroke="url(#sw)" strokeWidth={width} strokeLinecap="round" strokeDasharray={`${head - start} 2`} strokeDashoffset={-start} />
    </svg>
  );
}

function LogoMark({ size, ring = 0 }: { size: number; ring?: number }) {
  return (
    <div className="relative" style={{ width: `${size}cqw`, height: `${size}cqw` }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="20" cy="20" r="14" fill={BRAND} />
        <circle cx="20" cy="20" r="7" fill="none" stroke="#fff" strokeWidth="2.4" />
        <circle cx="20" cy="20" r="3" fill="#fff" />
        {ring > 0 && <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="0.8" />}
        {ring > 0 && ring < 1 && (
          <circle cx="20" cy="20" r="19" fill="none" stroke={BRAND} strokeWidth="0.9" strokeLinecap="round" pathLength={1} strokeDasharray={`${ring * 0.8} 2`} transform={`rotate(${ring * 360 - 90} 20 20)`} />
        )}
      </svg>
    </div>
  );
}

/* --------------------------------- scenes --------------------------------- */

// 0.0 – 1.9  "Introducing", arcs, orb rising
function S1({ t }: { t: number }) {
  const arc = p(t, 0.2, 1.4, inOut);
  return (
    <Cut t={t} a={0} b={1.9} bg="#000">
      <svg viewBox="0 0 100 56.25" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d="M -10 70 Q 50 -10 110 70" fill="none" stroke="rgba(252,76,2,.35)" strokeWidth="0.12" pathLength={1} strokeDasharray={`${arc} 2`} />
        <path d="M -10 64 Q 30 5 80 64" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.1" pathLength={1} strokeDasharray={`${arc} 2`} />
      </svg>
      <Orb x={lerp(62, 58, p(t, 0.9, 1.9))} y={lerp(70, 50, p(t, 0.9, 1.9))} r={9} opacity={p(t, 0.9, 1.3)} />
      <Center>
        <Words t={t} at={0.25} text="Introducing" size={1.9} color="#fff" weight={400} />
      </Center>
    </Cut>
  );
}

// 1.9 – 2.7  full orange "Beta"
function S2({ t }: { t: number }) {
  return (
    <Cut t={t} a={1.9} b={2.7} bg="linear-gradient(135deg, #ff7a2f 0%, #fc4c02 55%, #e53a00 100%)">
      <Center>
        <Words t={t} at={1.95} text="Beta" size={1.9} color="#fff" weight={400} />
      </Center>
    </Cut>
  );
}

// 2.7 – 4.2  huge "Review" behind orbs
function S3({ t }: { t: number }) {
  const k = p(t, 2.7, 4.2, (x) => x);
  return (
    <Cut t={t} a={2.7} b={4.2} bg="#000">
      <Center>
        <div
          style={{
            fontSize: "19cqw",
            fontWeight: 600,
            letterSpacing: "-0.06em",
            backgroundImage: "linear-gradient(180deg, #ffb070 0%, #fc4c02 55%, #8a2600 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            transform: `scale(${lerp(1.08, 1, p(t, 2.7, 3.6))})`,
          }}
        >
          Review
        </div>
      </Center>
      <Orb x={lerp(14, 20, k)} y={lerp(40, 34, k)} r={17} />
      <Orb x={lerp(90, 84, k)} y={lerp(10, 16, k)} r={13} />
    </Cut>
  );
}

// 4.2 – 5.5  white: "See every move you make"
function S4({ t }: { t: number }) {
  return (
    <Cut t={t} a={4.2} b={5.5} bg="#fff">
      <Center>
        <Words t={t} at={4.25} text="See every move you make" step={0.12} size={2.3} color={INK} />
      </Center>
    </Cut>
  );
}

const MOVE_ROWS: { time: string; text: string; r: RK; send: number }[] = [
  { time: "0:02", text: "Toe hook the volume, stand up", r: "great", send: 75 },
  { time: "0:04", text: "Right drop-knee to the pinch", r: "brilliant", send: 83 },
  { time: "0:09", text: "Cross to the undercling, flag right", r: "good", send: 78 },
  { time: "0:11", text: "Bent-arm slap to the sloper", r: "inaccuracy", send: 67 },
  { time: "0:15", text: "Hesitate under the crux", r: "mistake", send: 44 },
  { time: "0:21", text: "Let go of the heel and jump", r: "blunder", send: 1 },
];

function MoveCard({ m, scale = 1 }: { m: (typeof MOVE_ROWS)[number]; scale?: number }) {
  return (
    <div className="flex items-center rounded-[1.1cqw] bg-[#f2f2f4]" style={{ gap: `${1.6 * scale}cqw`, padding: `${1.1 * scale}cqw ${1.6 * scale}cqw`, width: `${46 * scale}cqw` }}>
      <div className="font-mono text-[#8e8e93]" style={{ fontSize: `${1.5 * scale}cqw`, width: `${5 * scale}cqw` }}>
        {m.time}
      </div>
      <div className="flex-1">
        <div style={{ fontSize: `${1.7 * scale}cqw`, color: INK, fontWeight: 500, letterSpacing: "-0.01em" }}>{m.text}</div>
        <div className="font-mono" style={{ fontSize: `${1.05 * scale}cqw`, color: "#8e8e93", marginTop: `${0.3 * scale}cqw` }}>
          SEND {m.send}%
        </div>
      </div>
      <div className="flex items-center justify-center rounded-full font-bold text-black" style={{ width: `${2.6 * scale}cqw`, height: `${2.6 * scale}cqw`, fontSize: `${1.2 * scale}cqw`, background: RC[m.r] }}>
        {SYM[m.r]}
      </div>
    </div>
  );
}

// 5.5 – 8.1  white: move cards with a NOW line, zooming out to the full list
function S5({ t }: { t: number }) {
  const zoom = lerp(2.1, 1, p(t, 6.4, 7.6, inOut));
  const nowRow = lerp(1.5, 4.5, p(t, 5.6, 7.9, smooth));
  const ROW = 6.4;
  return (
    <Cut t={t} a={5.5} b={8.1} bg="#fff">
      <Center>
        <div className="relative" style={{ transform: `scale(${zoom}) translateY(${(1 - p(t, 6.4, 7.6, inOut)) * 4}cqw)` }}>
          {MOVE_ROWS.map((m, i) => {
            const k = p(t, 5.5 + i * 0.07, 6.0 + i * 0.07);
            return (
              <div key={i} style={{ height: `${ROW}cqw`, opacity: k, transform: `translateY(${(1 - k) * 1.5}cqw)` }}>
                <MoveCard m={m} />
              </div>
            );
          })}
          <div className="absolute flex items-center" style={{ top: `${nowRow * ROW - 0.9}cqw`, left: "-7cqw", right: "-1cqw" }}>
            <span className="font-medium" style={{ fontSize: "1.2cqw", color: BRAND, width: "6cqw" }}>
              NOW
            </span>
            <span className="h-[0.12cqw] flex-1" style={{ background: BRAND, opacity: 0.6 }} />
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 8.1 – 10.3  white: coach notes typing
function S6({ t }: { t: number }) {
  const expand = p(t, 9.1, 9.8, inOut);
  return (
    <Cut t={t} a={8.1} b={10.3} bg="#fff">
      <Center>
        <div style={{ width: "44cqw", transform: `translateY(${-expand * 3}cqw) scale(${lerp(1.5, 1, expand)})`, transformOrigin: "0 50%" }}>
          <div style={{ fontSize: "2cqw", color: INK, letterSpacing: "0.02em", fontWeight: 500 }}>COACH</div>
          <div className="mt-[1.6cqw] flex items-center gap-[1cqw]" style={{ fontSize: "1.9cqw", color: INK, fontWeight: 500 }}>
            <span className="rounded-full px-[0.8cqw] py-[0.2cqw] text-[1.1cqw] font-bold text-black" style={{ background: RC.inaccuracy }}>
              ?!
            </span>
            <Type t={t} at={8.3} text="Hips sag away from the wall" caret={t < 9.3} />
          </div>
          <div style={{ opacity: expand, marginTop: "1.4cqw" }}>
            <div style={{ fontSize: "1.1cqw", color: "#8e8e93", fontWeight: 600, letterSpacing: "0.08em" }}>WHY</div>
            <div style={{ fontSize: "1.35cqw", color: "#3a3a3c", lineHeight: 1.45, marginTop: "0.3cqw" }}>
              <Type t={t} at={9.3} cps={70} caret={false} text="You slapped with bent arms and your hips swung out, so your forearms did all the work." />
            </div>
            <div style={{ fontSize: "1.1cqw", color: BRAND, fontWeight: 600, letterSpacing: "0.08em", marginTop: "1.2cqw" }}>BETTER</div>
            <div style={{ fontSize: "1.35cqw", color: "#3a3a3c", lineHeight: 1.45, marginTop: "0.3cqw" }}>
              <Type t={t} at={9.6} cps={70} caret={false} text="Turn your left hip in, keep the arm straight, and let your legs make the distance." />
            </div>
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 10.3 – 11.9  white: leaderboard tabs with sliding underline, ending on the logo button
function S7({ t }: { t: number }) {
  const tabs = ["Points", "Flash", "Project", "This week"];
  const pos = lerp(0, 3, p(t, 10.5, 11.3, inOut));
  const active = Math.round(pos);
  const W = 9;
  const fadeTabs = p(t, 11.35, 11.75, smooth);
  return (
    <Cut t={t} a={10.3} b={11.9} bg="#fff">
      <Center>
        <div className="relative flex items-center" style={{ gap: "0cqw" }}>
          {tabs.map((label, i) => (
            <div key={label} className="text-center" style={{ width: `${W}cqw`, fontSize: "1.6cqw", fontWeight: 500, color: i === active ? INK : "#b0b0b6", opacity: 1 - fadeTabs * (i === 3 ? 0.3 : 1) }}>
              {label}
            </div>
          ))}
          <div className="absolute h-[0.18cqw] rounded-full" style={{ background: BRAND, width: "5cqw", left: `${pos * W + 2}cqw`, top: "2.8cqw", opacity: 1 - fadeTabs }} />
          <div style={{ marginLeft: "1.4cqw", transform: `scale(${lerp(0.6, 1, p(t, 10.4, 10.9))})` }}>
            <LogoMark size={3.6} />
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 11.9 – 12.5  a huge soft orb swallows the frame
function S8({ t }: { t: number }) {
  const k = p(t, 11.9, 12.5, smooth);
  return (
    <Cut t={t} a={11.9} b={12.5} bg={k > 0.8 ? "#000" : "#fff"}>
      <Orb x={50} y={28} r={lerp(12, 60, k)} blur={lerp(1.5, 4, k)} />
    </Cut>
  );
}

// 12.5 – 15.1  black: "Climb" + swoosh, "smarter", "with Beta Review" + ring
function S9({ t }: { t: number }) {
  const phase = t < 13.3 ? 0 : t < 14.0 ? 1 : 2;
  return (
    <Cut t={t} a={12.5} b={15.1} bg="#000">
      {phase === 0 && (
        <>
          <Center>
            <Words t={t} at={12.5} text="Climb" size={5.6} color="#fff" />
          </Center>
          <Orb x={lerp(90, 74, p(t, 12.5, 13.3))} y={lerp(58, 46, p(t, 12.5, 13.3))} r={6} blur={0.6} />
        </>
      )}
      {phase === 1 && (
        <>
          <Center>
            <div style={{ fontSize: "5.6cqw", color: "#fff", fontWeight: 500, letterSpacing: "-0.02em", filter: `blur(${(1 - p(t, 13.3, 13.7)) * 0.6}cqw)` }}>smarter</div>
          </Center>
          <Swoosh d="M 22 44 Q 45 52 70 38" draw={p(t, 13.3, 13.9, inOut) * 1.2} tail={0.7} width={1.6} blur={0.25} />
        </>
      )}
      {phase === 2 && (
        <Center>
          <div className="flex items-center gap-[2cqw]">
            <Words t={t} at={14.0} text="with Beta Review" step={0.1} size={2.6} color="#fff" />
            <div style={{ opacity: p(t, 14.2, 14.5) }}>
              <LogoMark size={5} ring={p(t, 14.2, 14.9, inOut)} />
            </div>
          </div>
          <Swoosh d="M 78 20 Q 70 34 60 38" draw={p(t, 14.0, 14.4, inOut) * 1.3} tail={0.5} width={0.9} blur={0.15} style={{ opacity: 1 - p(t, 14.5, 14.8) }} />
        </Center>
      )}
    </Cut>
  );
}

// 15.1 – 17.6  black: upload pill typing, camera pushes into the send button
function S10({ t }: { t: number }) {
  const push = p(t, 16.6, 17.5, inOut);
  const pressed = t > 17.2;
  return (
    <Cut t={t} a={15.1} b={17.6} bg="#000">
      <Center>
        <div style={{ transform: `scale(${lerp(1, 3.2, push)})`, transformOrigin: "88% 50%" }}>
          <div className="flex items-center rounded-full border border-white/10 bg-[#0e0e10]" style={{ width: "40cqw", padding: "0.9cqw 0.9cqw 0.9cqw 1.6cqw", gap: "1.2cqw" }}>
            <svg viewBox="0 0 24 24" style={{ width: "1.4cqw", height: "1.4cqw" }} fill="none" stroke={BRAND} strokeWidth={2} aria-hidden>
              <rect x="3" y="6" width="13" height="12" rx="2" />
              <path d="m16 10 5-3v10l-5-3" />
            </svg>
            <div className="flex-1" style={{ fontSize: "1.25cqw", color: "#e5e5ea", letterSpacing: "0.005em" }}>
              <Type t={t} at={15.3} cps={28} text="attempt_04.mov · Why did I come off at the crux?" caret={t < 17} />
            </div>
            <div className="flex items-center justify-center rounded-full" style={{ width: "2.6cqw", height: "2.6cqw", background: BRAND, transform: `scale(${pressed ? 0.88 : 1})`, boxShadow: pressed ? "0 0 0 0.6cqw rgba(252,76,2,.25)" : "none" }}>
              <svg viewBox="0 0 24 24" style={{ width: "1.3cqw", height: "1.3cqw" }} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 17.6 – 19.6  black: analysis graph, lines and nodes
function S11({ t }: { t: number }) {
  const nodes = [
    { x: 60, y: 16, label: "Footwork" },
    { x: 66, y: 28, label: "Hip position" },
    { x: 60, y: 40, label: "Straight arms" },
  ];
  const ox = 30;
  const oy = 28;
  return (
    <Cut t={t} a={17.6} b={19.6} bg="#000">
      <svg viewBox="0 0 100 56.25" className="absolute inset-0 h-full w-full" aria-hidden>
        <line x1={0} y1={oy} x2={lerp(0, ox, p(t, 17.6, 18.1, inOut))} y2={oy} stroke="rgba(255,255,255,.22)" strokeWidth="0.08" />
        {nodes.map((n, i) => {
          const k = p(t, 18.0 + i * 0.15, 18.7 + i * 0.15, inOut);
          const mx = ox + 12;
          const path = `M ${ox} ${oy} L ${mx} ${oy} L ${mx} ${n.y} L ${n.x - 2} ${n.y}`;
          const dot = p(t, 18.4 + i * 0.15, 19.4 + i * 0.1, smooth);
          const dx = dot < 0.33 ? lerp(ox, mx, dot / 0.33) : dot < 0.66 ? mx : lerp(mx, n.x - 2, (dot - 0.66) / 0.34);
          const dy = dot < 0.33 ? oy : dot < 0.66 ? lerp(oy, n.y, (dot - 0.33) / 0.33) : n.y;
          return (
            <g key={n.label}>
              <path d={path} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.08" pathLength={1} strokeDasharray={`${k} 2`} />
              {dot > 0 && dot < 1 && <circle cx={dx} cy={dy} r="0.35" fill={BRAND} />}
            </g>
          );
        })}
        <circle cx={ox} cy={oy} r={0.55} fill={BRAND} opacity={p(t, 17.9, 18.1)} />
        <circle cx={ox} cy={oy} r={0.55 + ((t * 1.5) % 1) * 1.4} fill="none" stroke={BRAND} strokeWidth="0.08" opacity={(1 - ((t * 1.5) % 1)) * p(t, 17.9, 18.1)} />
      </svg>
      {nodes.map((n, i) => {
        const k = p(t, 18.5 + i * 0.15, 18.9 + i * 0.15);
        return (
          <div key={n.label} className="absolute flex items-center gap-[0.7cqw]" style={{ left: `${n.x}cqw`, top: `${n.y}cqw`, transform: "translateY(-50%)", opacity: k }}>
            <span className="rounded-full" style={{ width: "0.7cqw", height: "0.7cqw", background: BRAND }} />
            <span style={{ fontSize: "1.45cqw", color: "#fff", fontWeight: 500 }}>{n.label}</span>
          </div>
        );
      })}
    </Cut>
  );
}

// 19.6 – 20.6  "Reviewing •••"
function S12({ t }: { t: number }) {
  return (
    <Cut t={t} a={19.6} b={20.6} bg="#000">
      <Center>
        <div className="flex items-center" style={{ fontSize: "2.2cqw", color: "#8e8e93", fontWeight: 400, gap: "0.8cqw" }}>
          Reviewing
          <span className="flex gap-[0.35cqw]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rounded-full bg-[#8e8e93]" style={{ width: "0.45cqw", height: "0.45cqw", opacity: 0.3 + 0.7 * Math.max(0, Math.sin((t * 5 - i * 0.8) % (Math.PI * 2))) }} />
            ))}
          </span>
        </div>
      </Center>
    </Cut>
  );
}

// 20.6 – 23.0  black: accuracy and the rating dots
function S13({ t }: { t: number }) {
  const acc = 63.8 * p(t, 20.7, 21.8);
  const dots: RK[] = ["good", "great", "brilliant", "good", "good", "inaccuracy", "good", "mistake", "inaccuracy", "blunder"];
  return (
    <Cut t={t} a={20.6} b={23.0} bg="#000">
      <Center>
        <div className="flex flex-col items-center">
          <div style={{ fontSize: "1.3cqw", color: "#8e8e93", letterSpacing: "0.18em", fontWeight: 500, opacity: p(t, 20.6, 21) }}>ACCURACY</div>
          <div style={{ fontSize: "11cqw", color: "#fff", fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {acc.toFixed(1)}
            <span style={{ fontSize: "4cqw", color: "#8e8e93" }}>%</span>
          </div>
          <div className="mt-[2.4cqw] flex items-center gap-[1.4cqw]">
            {dots.map((r, i) => {
              const k = p(t, 21.3 + i * 0.07, 21.7 + i * 0.07);
              return <span key={i} className="rounded-full" style={{ width: "1.3cqw", height: "1.3cqw", background: RC[r], transform: `scale(${k})`, boxShadow: r === "blunder" ? `0 0 1.6cqw ${RC.blunder}` : "none" }} />;
            })}
          </div>
          <div className="mt-[1.8cqw]" style={{ fontSize: "1.4cqw", color: RC.blunder, fontWeight: 500, opacity: p(t, 22.1, 22.5) }}>
            ?? Blunder at the crux · 0:21
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 23.0 – 25.1  white: leaderboard, you climb, +14
function S14({ t }: { t: number }) {
  const rows = [
    { name: "Priya S.", v: "1,642" },
    { name: "Tomás R.", v: "1,588" },
    { name: "Kemi A.", v: "1,511" },
    { name: "Josh W.", v: "1,436" },
  ];
  const climb = p(t, 23.7, 24.4, inOut);
  const ROW = 4.6;
  return (
    <Cut t={t} a={23.0} b={25.1} bg="#fff">
      <Center>
        <div className="relative" style={{ width: "40cqw", height: `${ROW * 5}cqw` }}>
          <div className="absolute -top-[4cqw] left-0 flex items-center gap-[0.8cqw]" style={{ fontSize: "1.3cqw", color: INK, fontWeight: 600, letterSpacing: "0.12em" }}>
            ALDGATE · FLASH
            <span className="rounded-full" style={{ width: "0.6cqw", height: "0.6cqw", background: BRAND, boxShadow: `0 0 0 ${((t * 1.6) % 1) * 0.6}cqw rgba(252,76,2,${0.5 - ((t * 1.6) % 1) * 0.5})` }} />
          </div>
          {rows.map((r, i) => {
            const y = i < 1 ? i : lerp(i, i + 1, climb);
            const k = p(t, 23.0 + i * 0.06, 23.4 + i * 0.06);
            return (
              <div key={r.name} className="absolute inset-x-0 flex items-center border-b border-black/[0.06]" style={{ top: `${y * ROW}cqw`, height: `${ROW}cqw`, opacity: k, fontSize: "1.55cqw", color: INK }}>
                <span className="text-[#8e8e93]" style={{ width: "3cqw" }}>
                  {i < 1 ? 1 : i + (climb > 0.5 ? 2 : 1)}
                </span>
                <span className="flex-1 font-medium">{r.name}</span>
                <span className="font-mono">{r.v}</span>
              </div>
            );
          })}
          <div
            className="absolute inset-x-[-1cqw] flex items-center rounded-[0.9cqw] px-[1cqw]"
            style={{ top: `${lerp(4, 1, climb) * ROW}cqw`, height: `${ROW}cqw`, background: "rgba(252,76,2,.09)", boxShadow: `inset 0 0 0 0.1cqw rgba(252,76,2,.5)`, fontSize: "1.55cqw", color: INK, opacity: p(t, 23.2, 23.5) }}
          >
            <span style={{ width: "3cqw", color: BRAND, fontWeight: 600 }}>{climb > 0.5 ? 2 : 5}</span>
            <span className="flex-1 font-semibold">You</span>
            <span className="mr-[1.4cqw] font-semibold" style={{ color: RC.good, opacity: p(t, 24.2, 24.5), transform: `scale(${lerp(0.6, 1, p(t, 24.2, 24.6))})` }}>
              +14
            </span>
            <span className="font-mono font-semibold">{Math.round(lerp(1409, 1603, climb)).toLocaleString("en-GB")}</span>
          </div>
        </div>
      </Center>
    </Cut>
  );
}

// 25.1 – 28  black: close
function S15({ t }: { t: number }) {
  const k = p(t, 25.1, 26.4, inOut);
  const brand = p(t, 26.1, 26.8);
  return (
    <Cut t={t} a={25.1} b={FILM_SECONDS + 5} bg="#000">
      <Orb x={lerp(80, 64, k)} y={lerp(-6, 6, k)} r={11} blur={lerp(0, 1.2, brand)} opacity={1 - brand * 0.4} />
      <Orb x={lerp(22, 38, k)} y={lerp(64, 52, k)} r={10} blur={lerp(0, 1.2, brand)} opacity={1 - brand * 0.4} />
      <Center style={{ opacity: 1 - brand }}>
        <Words t={t} at={25.2} text="Gyms keep members when members compete." step={0.09} size={2.4} color="#fff" />
      </Center>
      <Center style={{ opacity: brand }}>
        <div className="flex flex-col items-center" style={{ transform: `scale(${lerp(0.94, 1, brand)})` }}>
          <div className="flex items-center gap-[1.4cqw]">
            <LogoMark size={4.4} />
            <span style={{ fontSize: "3.6cqw", color: "#fff", fontWeight: 600, letterSpacing: "-0.03em" }}>Beta Review</span>
          </div>
          <div className="mt-[1.4cqw]" style={{ fontSize: "1.3cqw", color: "#8e8e93", letterSpacing: "0.04em", opacity: p(t, 26.6, 27.1) }}>
            Film. Review. Climb. — Now live at Aldgate
          </div>
        </div>
      </Center>
    </Cut>
  );
}

/* ---------------------------------- film ---------------------------------- */

export default function LaunchFilm({ fontFamily }: { fontFamily?: string }) {
  const [t, setT] = useState(0);
  const [hud, setHud] = useState(true);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rec = params.has("rec");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after mount
    if (rec) setHud(false);
    const at = Number(params.get("at"));
    if (params.has("at") && Number.isFinite(at)) {
      setT(at);
      setHud(false);
      (window as unknown as { __filmSeek?: (s: number) => void }).__filmSeek = setT;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const s = (now - start.current) / 1000;
      setT(rec ? Math.min(s, FILM_SECONDS) : s % (FILM_SECONDS + 0.5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => (start.current = null)}>
      <div
        className="relative overflow-hidden bg-black"
        style={{ containerType: "size", width: "min(100vw, calc(100dvh * 16 / 9))", aspectRatio: "16 / 9", fontFamily }}
      >
        <S1 t={t} />
        <S2 t={t} />
        <S3 t={t} />
        <S4 t={t} />
        <S5 t={t} />
        <S6 t={t} />
        <S7 t={t} />
        <S8 t={t} />
        <S9 t={t} />
        <S10 t={t} />
        <S11 t={t} />
        <S12 t={t} />
        <S13 t={t} />
        <S14 t={t} />
        <S15 t={t} />
        {hud && (
          <div className="absolute inset-x-[30cqw] bottom-[1.6cqw] h-[0.2cqw] overflow-hidden rounded-full bg-white/15 mix-blend-difference">
            <div className="h-full bg-white/70" style={{ width: `${Math.min(100, (t / FILM_SECONDS) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
