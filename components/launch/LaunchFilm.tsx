"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * A 9:16 launch film, rendered live from one clock so it can be screen-recorded
 * on a phone or captured headlessly. Every size is in cqw (stage width %).
 */
export const FILM_SECONDS = 36;

const BRAND = "#fc4c02";
const R = {
  brilliant: "#1fc7b6",
  great: "#4f9ef0",
  good: "#7cc04b",
  inaccuracy: "#f5c542",
  mistake: "#f28a2e",
  blunder: "#ec4b4b",
};

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const spring = (x: number) => {
  const c = clamp(x);
  return 1 - Math.cos(c * Math.PI * 2.4) * Math.exp(-c * 6.5);
};
/** 0 -> 1 between a and b, eased. */
const p = (t: number, a: number, b: number, ease = easeOut) => ease(clamp((t - a) / (b - a)));
/** Fades in at a, out at b. */
const win = (t: number, a: number, b: number, f = 0.45) => Math.min(p(t, a, a + f), 1 - p(t, b - f, b));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function Scene({ t, a, b, children, style }: { t: number; a: number; b: number; children: ReactNode; style?: CSSProperties }) {
  const o = win(t, a, b);
  if (o <= 0) return null;
  return (
    <div className="absolute inset-0" style={{ opacity: o, ...style }}>
      {children}
    </div>
  );
}

/** Word-by-word blur-up reveal. */
function Reveal({ t, at, text, step = 0.09, className, style }: { t: number; at: number; text: string; step?: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={style}>
      {text.split(" ").map((w, i) => {
        const k = p(t, at + i * step, at + i * step + 0.7);
        return (
          <span
            key={i}
            className="inline-block"
            style={{
              opacity: k,
              filter: `blur(${(1 - k) * 1.6}cqw)`,
              transform: `translateY(${(1 - k) * 4}cqw)`,
              marginRight: "0.26em",
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}

function Caption({ t, at, n, text }: { t: number; at: number; n: string; text: string }) {
  const k = p(t, at, at + 0.8);
  return (
    <div className="absolute inset-x-0 top-[9cqw] flex flex-col items-center gap-[1.6cqw]" style={{ opacity: k }}>
      <span className="font-mono text-[2.6cqw] tracking-[0.4em] text-white/45" style={{ transform: `translateY(${(1 - k) * 2}cqw)` }}>
        {n}
      </span>
      <Reveal t={t} at={at + 0.1} text={text} className="text-center text-[6.6cqw] font-semibold tracking-[-0.03em] text-white" />
    </div>
  );
}

function Logo({ size, draw = 1, dot = 1 }: { size: number; draw?: number; dot?: number }) {
  const c = 2 * Math.PI * 15;
  return (
    <svg viewBox="0 0 64 64" style={{ width: `${size}cqw`, height: `${size}cqw` }} aria-hidden>
      <rect width="64" height="64" rx="16" fill={BRAND} opacity={draw} />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray={c} strokeDashoffset={c * (1 - draw)} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <circle cx="32" cy="32" r={6.5 * dot} fill="#fff" />
    </svg>
  );
}

/* ---------- climbing wall + climber (shared by the phone scenes) ---------- */

const HOLDS: [number, number, number][] = [
  [30, 88, 3.2], [58, 82, 2.6], [42, 72, 3], [66, 64, 2.4], [36, 56, 3.4], [60, 47, 2.8],
  [44, 38, 3], [68, 30, 2.6], [50, 20, 3.6], [22, 66, 2], [78, 76, 2], [18, 40, 2.2], [82, 44, 2.2], [26, 24, 2],
];
const ROUTE = [0, 2, 4, 5, 6, 7];

function Wall({ climb, fall = 0 }: { climb: number; fall?: number }) {
  // climber position along the route
  const seg = climb * (ROUTE.length - 1);
  const i = Math.min(ROUTE.length - 2, Math.floor(seg));
  const k = easeInOut(seg - i);
  const A = HOLDS[ROUTE[i]];
  const B = HOLDS[ROUTE[i + 1]];
  const x = lerp(A[0], B[0], k);
  const y = lerp(A[1], B[1], k) + fall * fall * 60;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="wallg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#26262b" />
          <stop offset="1" stopColor="#141417" />
        </linearGradient>
        <radialGradient id="spot" cx={x / 100} cy={Math.min(y, 95) / 100} r="0.45">
          <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#wallg)" />
      {Array.from({ length: 11 }).map((_, r) =>
        Array.from({ length: 9 }).map((__, c) => <circle key={`${r}-${c}`} cx={6 + c * 11} cy={4 + r * 9.5} r="0.35" fill="#fff" opacity="0.08" />),
      )}
      <polygon points="12,34 34,28 38,46 16,50" fill="#1e1e22" stroke="#34343a" strokeWidth="0.4" />
      <polygon points="60,58 84,52 86,72 64,76" fill="#1e1e22" stroke="#34343a" strokeWidth="0.4" />
      <rect width="100" height="100" fill="url(#spot)" />
      {HOLDS.map(([hx, hy, hr], j) => {
        const onRoute = ROUTE.includes(j);
        return (
          <ellipse key={j} cx={hx} cy={hy} rx={hr} ry={hr * 0.72} fill={onRoute ? "#d9d9de" : "#3a3a42"} opacity={onRoute ? 0.9 : 0.8} />
        );
      })}
      {/* climber: body dot + limbs to nearby holds */}
      <g opacity={1 - clamp(fall * 1.4 - 0.9)}>
        <line x1={x} y1={y} x2={x - 6} y2={y - 7 + Math.sin(climb * 30) * 1.5} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        <line x1={x} y1={y} x2={x + 6} y2={y - 6 - Math.sin(climb * 30) * 1.5} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        <line x1={x} y1={y + 4} x2={x - 5} y2={y + 11} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        <line x1={x} y1={y + 4} x2={x + 5} y2={y + 10} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        <line x1={x} y1={y - 1} x2={x} y2={y + 4.5} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={x} cy={y - 3.2} r="2" fill={BRAND} />
      </g>
    </svg>
  );
}

function Phone({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 w-[64cqw] overflow-hidden rounded-[9cqw] border-[1.1cqw] border-[#2a2a2e] bg-[#0b0b0c]"
      style={{
        aspectRatio: "9 / 19",
        boxShadow: "0 6cqw 16cqw rgba(0,0,0,.7), 0 0 0 0.3cqw #3a3a40, inset 0 0 0 0.3cqw #000",
        ...style,
      }}
    >
      <div className="absolute left-1/2 top-[2cqw] z-20 h-[4.4cqw] w-[18cqw] -translate-x-1/2 rounded-full bg-black" />
      {children}
    </div>
  );
}

/* --------------------------------- scenes --------------------------------- */

function Hook({ t }: { t: number }) {
  const zoom = lerp(1.04, 1, p(t, 0, 5.5));
  return (
    <Scene t={t} a={0} b={5.4}>
      <div className="flex h-full flex-col items-center justify-center gap-[3cqw] px-[8cqw] text-center" style={{ transform: `scale(${zoom})` }}>
        <Reveal t={t} at={0.4} text="Every climber falls." className="text-[10cqw] font-semibold leading-[1.02] tracking-[-0.045em] text-white" />
        <Reveal t={t} at={2.3} text="Almost nobody knows why." step={0.12} className="text-[10cqw] font-semibold leading-[1.02] tracking-[-0.045em]" style={{ color: BRAND }} />
      </div>
    </Scene>
  );
}

function Brand({ t }: { t: number }) {
  const draw = p(t, 5.6, 6.8, easeInOut);
  const pop = spring((t - 6.5) / 1.1);
  const lift = p(t, 7.3, 8.3);
  return (
    <Scene t={t} a={5.4} b={9.4}>
      <div className="flex h-full flex-col items-center justify-center">
        <div style={{ transform: `scale(${0.6 + 0.4 * pop}) translateY(${-lift * 4}cqw)` }}>
          <Logo size={26} draw={draw} dot={pop} />
        </div>
        <div className="mt-[6cqw] overflow-hidden text-[11cqw] font-bold tracking-[-0.05em] text-white">
          {"Beta Review".split("").map((ch, i) => {
            const k = p(t, 6.9 + i * 0.035, 7.6 + i * 0.035);
            return (
              <span key={i} className="inline-block" style={{ transform: `translateY(${(1 - k) * 110}%)`, whiteSpace: "pre" }}>
                {ch}
              </span>
            );
          })}
        </div>
        <Reveal t={t} at={7.8} text="Film your climb. See every move." className="mt-[2.4cqw] text-[4.4cqw] text-white/55" />
      </div>
    </Scene>
  );
}

function Record({ t }: { t: number }) {
  const inK = p(t, 9.2, 10.2);
  const climb = clamp((t - 10) / 3.4);
  const flash = t > 13.4 && t < 13.75 ? 1 - (t - 13.4) / 0.35 : 0;
  const filmK = (i: number) => p(t, 13.6 + i * 0.12, 14.1 + i * 0.12);
  const secs = Math.max(0, t - 10);
  const film = p(t, 13.3, 14.1, easeInOut);
  return (
    <Scene t={t} a={9.2} b={15.6}>
      <Caption t={t} at={9.4} n="01" text="Film your attempt" />
      <Phone style={{ transform: `translate(-50%, -44%) translateY(${(1 - inK) * 30 - film * 22}cqw) rotate(${(1 - inK) * -6}deg) scale(${1 - 0.28 * film})` }}>
        <Wall climb={climb} />
        <div className="absolute left-[5cqw] top-[9cqw] z-10 flex items-center gap-[1.4cqw] rounded-full bg-black/60 px-[2.6cqw] py-[1.2cqw] font-mono text-[2.8cqw] text-white">
          <span className="h-[2cqw] w-[2cqw] rounded-full bg-[#ec4b4b]" style={{ opacity: Math.floor(t * 2) % 2 ? 1 : 0.35 }} />
          0:{String(Math.floor(secs)).padStart(2, "0")}
        </div>
        <div className="absolute inset-x-0 bottom-[6cqw] z-10 flex justify-center">
          <div className="flex h-[14cqw] w-[14cqw] items-center justify-center rounded-full border-[0.9cqw] border-white">
            <div className="h-[6cqw] w-[6cqw] rounded-[1.4cqw] bg-[#ec4b4b]" />
          </div>
        </div>
        <div className="absolute inset-0 z-30 bg-white" style={{ opacity: flash }} />
      </Phone>
      <div className="absolute inset-x-[6cqw] bottom-[9cqw] grid grid-cols-6 gap-[1.4cqw]">
        {Array.from({ length: 12 }).map((_, i) => {
          const k = filmK(i);
          return (
            <div key={i} className="relative overflow-hidden rounded-[1.4cqw] border border-white/10" style={{ aspectRatio: "3 / 4", opacity: k, transform: `translateY(${(1 - k) * 5}cqw) scale(${0.8 + 0.2 * k})` }}>
              <Wall climb={i / 11} />
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

const MOVES = [
  { at: 0.12, r: "good" as const, sym: "✓", label: "Good", text: "Pull on, weight on your feet", send: 72 },
  { at: 0.28, r: "brilliant" as const, sym: "!!", label: "Brilliant", text: "Drop knee to the pinch", send: 81 },
  { at: 0.44, r: "good" as const, sym: "✓", label: "Good", text: "Flag right, reach the edge", send: 78 },
  { at: 0.6, r: "inaccuracy" as const, sym: "?!", label: "Inaccuracy", text: "Hips sag off the wall", send: 58 },
  { at: 0.74, r: "mistake" as const, sym: "?", label: "Mistake", text: "Bent-arm slap to the sloper", send: 41 },
  { at: 0.88, r: "blunder" as const, sym: "??", label: "Blunder", text: "Throw for the top from low feet", send: 4 },
];

function ReviewScene({ t }: { t: number }) {
  const inK = p(t, 15.4, 16.4);
  const play = clamp((t - 16.2) / 5.2);
  let cur = 0;
  MOVES.forEach((m, i) => {
    if (play >= m.at) cur = i;
  });
  const send = play < MOVES[0].at ? 72 : MOVES[cur].send;
  const acc = 63.8 * p(t, 16.4, 18.4);
  const m = MOVES[cur];
  const cardK = p(t, 16.4, 17);
  return (
    <Scene t={t} a={15.4} b={22.4}>
      <Caption t={t} at={15.6} n="02" text="Every move, rated" />
      <Phone style={{ transform: `translate(-50%, -44%) scale(${0.92 + 0.08 * inK})` }}>
        <div className="absolute inset-x-[4cqw] top-[9cqw] flex gap-[1.6cqw]" style={{ height: "46%" }}>
          <div className="relative w-[2.6cqw] overflow-hidden rounded-full bg-white/10">
            <div className="absolute inset-x-0 bottom-0 rounded-full bg-white" style={{ height: `${send}%`, transition: "height .5s cubic-bezier(.2,.8,.2,1)" }} />
          </div>
          <div className="relative flex-1 overflow-hidden rounded-[3.4cqw]">
            <Wall climb={play * 0.92} fall={p(t, 20.6, 21.6, (x) => x)} />
            <div className="absolute left-[2cqw] top-[2cqw] flex items-center gap-[1.4cqw] rounded-full bg-black/65 px-[2cqw] py-[1cqw] text-[2.5cqw] text-white" style={{ opacity: cardK }}>
              <span className="flex h-[3.6cqw] w-[3.6cqw] items-center justify-center rounded-full text-[2cqw] font-bold text-black" style={{ background: R[m.r] }}>
                {m.sym}
              </span>
              {m.label}
            </div>
          </div>
        </div>
        {/* timeline */}
        <div className="absolute inset-x-[5cqw]" style={{ top: "calc(46% + 12cqw)" }}>
          <div className="relative h-[0.8cqw] rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${play * 100}%` }} />
            {MOVES.map((mv, i) => {
              const k = spring((t - 16.3 - i * 0.12) / 0.8);
              return (
                <span
                  key={i}
                  className="absolute top-1/2 h-[3cqw] w-[3cqw] rounded-full"
                  style={{
                    left: `${mv.at * 100}%`,
                    background: R[mv.r],
                    transform: `translate(-50%, -50%) scale(${k * (i === cur && play >= mv.at ? 1.35 : 1)})`,
                    boxShadow: i === cur && play >= mv.at ? `0 0 2.4cqw ${R[mv.r]}` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* summary */}
        <div className="absolute inset-x-[4cqw] rounded-[3.4cqw] bg-[#18181a] p-[3.4cqw]" style={{ top: "calc(46% + 18cqw)", opacity: cardK, transform: `translateY(${(1 - cardK) * 4}cqw)` }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[2.2cqw] font-semibold tracking-[0.2em] text-white/45">ACCURACY</div>
              <div className="text-[11cqw] font-bold leading-none tracking-[-0.05em] text-white tabular-nums">
                {acc.toFixed(1)}
                <span className="text-[4.4cqw] text-white/50">%</span>
              </div>
            </div>
            <span className="rounded-full px-[2.4cqw] py-[1cqw] text-[2.8cqw] font-semibold" style={{ background: "rgba(236,75,75,.14)", color: R.blunder, opacity: p(t, 21, 21.4) }}>
              ● Fell
            </span>
          </div>
          <div className="mt-[2.6cqw] space-y-[1.4cqw]">
            {MOVES.slice(Math.max(0, cur - 1), cur + 1).map((mv) => (
              <div key={mv.text} className="flex items-center gap-[2cqw] rounded-[2cqw] bg-white/[0.04] px-[2cqw] py-[1.6cqw]">
                <span className="flex h-[4.4cqw] w-[4.4cqw] shrink-0 items-center justify-center rounded-full text-[2.2cqw] font-bold text-black" style={{ background: R[mv.r] }}>
                  {mv.sym}
                </span>
                <span className="text-[2.9cqw] text-white/85">{mv.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>
      {/* floating blunder callout */}
      <div
        className="absolute right-[7cqw] top-[52%] rounded-[3cqw] border px-[3.4cqw] py-[2.4cqw] backdrop-blur"
        style={{
          borderColor: `${R.blunder}66`,
          background: "rgba(24,24,26,.85)",
          opacity: p(t, 20.4, 20.9),
          transform: `translateX(${(1 - p(t, 20.4, 21.1)) * 12}cqw) rotate(3deg)`,
          boxShadow: `0 3cqw 10cqw rgba(236,75,75,.25)`,
        }}
      >
        <div className="text-[5.4cqw] font-bold leading-none" style={{ color: R.blunder }}>
          ?? Blunder
        </div>
        <div className="mt-[1cqw] text-[2.8cqw] text-white/70">Send chance 81% → 4%</div>
      </div>
    </Scene>
  );
}

function Fix({ t }: { t: number }) {
  const k = p(t, 22.3, 23.2);
  return (
    <Scene t={t} a={22.2} b={26}>
      <Caption t={t} at={22.4} n="03" text="Know exactly what to fix" />
      <div className="absolute inset-x-[7cqw] top-1/2 -translate-y-1/2">
        <div className="rounded-[5cqw] border border-white/10 bg-[#18181a] p-[6cqw]" style={{ opacity: k, transform: `translateY(${(1 - k) * 8}cqw) scale(${0.96 + 0.04 * k})`, boxShadow: `0 4cqw 14cqw rgba(0,0,0,.6)` }}>
          <div className="flex items-center justify-between">
            <span className="text-[5.4cqw] font-bold text-white">What to try next time</span>
          </div>
          <span className="mt-[2cqw] inline-block rounded-full px-[2.4cqw] py-[0.8cqw] font-mono text-[2.8cqw]" style={{ background: "rgba(236,75,75,.14)", color: R.blunder }}>
            Crux · 0:21
          </span>
          <div className="mt-[4cqw] text-[2.6cqw] font-semibold tracking-[0.2em]" style={{ color: R.blunder }}>
            WHAT WENT WRONG
          </div>
          <Reveal t={t} at={23} step={0.04} text="Feet too low, bent arm, hips off the wall. The reach became a jump you couldn't hold." className="mt-[1.4cqw] block text-[4cqw] leading-snug text-white/80" />
          <div className="mt-[4cqw] text-[2.6cqw] font-semibold tracking-[0.2em]" style={{ color: R.good }}>
            TRY THIS
          </div>
          <Reveal t={t} at={23.9} step={0.04} text="Step your right foot up first, turn your hip in, and reach from a straight arm." className="mt-[1.4cqw] block text-[4cqw] leading-snug text-white" />
        </div>
      </div>
    </Scene>
  );
}

function Rating({ t }: { t: number }) {
  const pop = spring((t - 26.2) / 1.2);
  const n = Math.round(14 * p(t, 26.2, 27.4));
  const rating = Math.round(1200 + 14 * p(t, 26.4, 27.6));
  return (
    <Scene t={t} a={25.8} b={29}>
      <Caption t={t} at={26} n="04" text="Send it. Climb the rating." />
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-[2.8cqw] font-semibold tracking-[0.35em] text-white/45">FLASH RATING</div>
        <div
          className="mt-[2cqw] text-[40cqw] font-bold leading-none tracking-[-0.07em] tabular-nums"
          style={{ color: R.good, transform: `scale(${0.4 + 0.6 * pop})`, textShadow: `0 0 12cqw rgba(124,192,75,.35)` }}
        >
          +{n}
        </div>
        <div className="mt-[3cqw] font-mono text-[5cqw] text-white/60">
          1200 <span className="text-white/30">→</span> <span className="font-bold text-white">{rating}</span>
        </div>
        <div className="mt-[5cqw] flex gap-[2.4cqw]" style={{ opacity: p(t, 27.2, 27.8) }}>
          <span className="rounded-full bg-white/[0.06] px-[3.4cqw] py-[1.6cqw] text-[3.2cqw] text-white/80">+108 points</span>
          <span className="rounded-full bg-white/[0.06] px-[3.4cqw] py-[1.6cqw] text-[3.2cqw] text-white/80">V4 · Flash</span>
        </div>
      </div>
    </Scene>
  );
}

const BOARD = [
  { name: "Priya S.", pts: 14812 },
  { name: "Tomás R.", pts: 11694 },
  { name: "Kemi A.", pts: 7761 },
  { name: "Josh W.", pts: 4703 },
  { name: "Mei L.", pts: 3748 },
];

function Board({ t }: { t: number }) {
  const climb = p(t, 30.2, 31.3, easeInOut); // you move from #6 to #3
  const youPts = Math.round(lerp(3610, 7904, p(t, 30.1, 31.2)));
  const ROW = 13.6;
  return (
    <Scene t={t} a={28.8} b={32.8}>
      <Caption t={t} at={29} n="05" text="Your whole gym, live" />
      <div className="absolute inset-x-[6cqw] top-[33cqw]">
        <div className="mb-[3cqw] flex items-end justify-between">
          <div>
            <div className="text-[2.6cqw] tracking-[0.3em] text-white/45">LONDON</div>
            <div className="text-[9cqw] font-bold tracking-[-0.05em] text-white">Aldgate</div>
          </div>
          <div className="mb-[2cqw] flex items-center gap-[1.6cqw] rounded-full px-[2.6cqw] py-[1.2cqw] text-[2.8cqw] font-bold tracking-[0.2em]" style={{ background: "rgba(252,76,2,.15)", color: BRAND }}>
            <span className="relative h-[2cqw] w-[2cqw] rounded-full" style={{ background: BRAND, boxShadow: `0 0 0 ${(t * 1.6) % 1 * 2}cqw rgba(252,76,2,${0.6 - ((t * 1.6) % 1) * 0.6})` }} />
            LIVE
          </div>
        </div>
        <div className="relative rounded-[4cqw] bg-[#18181a]" style={{ height: `${ROW * 6 + 2}cqw` }}>
          {BOARD.map((r, i) => {
            const rank = i < 2 ? i : i + (climb > 0.5 ? 1 : 0);
            const y = i < 2 ? i : lerp(i, i + 1, climb);
            const k = p(t, 29.2 + i * 0.08, 29.8 + i * 0.08);
            return (
              <div key={r.name} className="absolute inset-x-[3cqw] flex items-center gap-[3cqw]" style={{ top: `${1 + y * ROW}cqw`, height: `${ROW}cqw`, opacity: k }}>
                <span className="w-[5cqw] text-center text-[4cqw] font-semibold text-white/50">{rank + 1}</span>
                <span className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full bg-white/[0.07] text-[3.4cqw] font-semibold text-white">{r.name[0]}</span>
                <span className="flex-1 text-[4.2cqw] font-semibold text-white">{r.name}</span>
                <span className="text-[4.4cqw] font-bold tabular-nums text-white">{r.pts.toLocaleString("en-GB")}</span>
              </div>
            );
          })}
          <div
            className="absolute inset-x-[1.4cqw] flex items-center gap-[3cqw] rounded-[3cqw] px-[1.6cqw]"
            style={{
              top: `${1 + lerp(5, 2, climb) * ROW}cqw`,
              height: `${ROW}cqw`,
              background: "linear-gradient(90deg, rgba(252,76,2,.28), rgba(252,76,2,.12))",
              boxShadow: `0 0 0 0.3cqw rgba(252,76,2,.55), 0 2cqw 8cqw rgba(252,76,2,${0.15 + 0.25 * Math.sin(climb * Math.PI)})`,
              opacity: p(t, 29.6, 30),
              transform: `scale(${1 + 0.04 * Math.sin(climb * Math.PI)})`,
            }}
          >
            <span className="w-[5cqw] text-center text-[4cqw] font-bold text-white">{climb > 0.5 ? 3 : 6}</span>
            <span className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full text-[3.4cqw] font-bold text-white" style={{ background: BRAND }}>
              Y
            </span>
            <span className="flex flex-1 items-center gap-[1.6cqw] text-[4.2cqw] font-semibold text-white">
              You
              <span className="rounded-full px-[1.6cqw] py-[0.4cqw] text-[2.2cqw] font-bold" style={{ background: BRAND }}>
                ▲ 3
              </span>
            </span>
            <span className="text-[4.4cqw] font-bold tabular-nums text-white">{youPts.toLocaleString("en-GB")}</span>
          </div>
        </div>
      </div>
    </Scene>
  );
}

function Close({ t }: { t: number }) {
  const logoK = spring((t - 34) / 1.1);
  return (
    <Scene t={t} a={32.6} b={FILM_SECONDS + 1}>
      <div className="flex h-full flex-col items-center justify-center px-[8cqw] text-center">
        <div style={{ opacity: 1 - p(t, 33.8, 34.2) , transform: `translateY(${-p(t, 33.8, 34.4) * 6}cqw)` }}>
          <Reveal t={t} at={32.8} text="Gyms keep members" className="block text-[9.4cqw] font-semibold leading-[1.05] tracking-[-0.045em] text-white" />
          <Reveal t={t} at={33.2} text="when members compete." className="block text-[9.4cqw] font-semibold leading-[1.05] tracking-[-0.045em]" style={{ color: BRAND }} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: p(t, 34, 34.5) }}>
          <div style={{ transform: `scale(${0.5 + 0.5 * logoK})` }}>
            <Logo size={20} />
          </div>
          <div className="mt-[5cqw] text-[10cqw] font-bold tracking-[-0.05em] text-white">Beta Review</div>
          <div className="mt-[1.4cqw] text-[4cqw] text-white/55">Now live at Aldgate</div>
        </div>
      </div>
    </Scene>
  );
}

/* ---------------------------------- film ---------------------------------- */

export default function LaunchFilm() {
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
      // Freeze on one moment (for stills).
      setT(at);
      setHud(false);
      // Frame-by-frame export: the renderer drives the clock.
      (window as unknown as { __filmSeek?: (s: number) => void }).__filmSeek = setT;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const s = (now - start.current) / 1000;
      setT(rec ? Math.min(s, FILM_SECONDS) : s % (FILM_SECONDS + 1.5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const glowX = 50 + Math.sin(t * 0.35) * 18;
  const glowY = 40 + Math.cos(t * 0.27) * 12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => (start.current = null)}>
      <div
        className="relative overflow-hidden bg-[#050506]"
        style={{ containerType: "size", width: "min(100vw, calc(100dvh * 9 / 16))", aspectRatio: "9 / 16", fontFamily: "var(--font-sans)" }}
      >
        {/* ambient light */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60cqw 60cqw at ${glowX}% ${glowY}%, rgba(252,76,2,.16), transparent 70%), radial-gradient(80cqw 50cqw at 50% 110%, rgba(79,158,240,.07), transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "8cqw 8cqw", backgroundPosition: `0 ${(t * 2) % 8}cqw`, maskImage: "radial-gradient(circle at 50% 50%, #000 20%, transparent 75%)" }}
        />

        <Hook t={t} />
        <Brand t={t} />
        <Record t={t} />
        <ReviewScene t={t} />
        <Fix t={t} />
        <Rating t={t} />
        <Board t={t} />
        <Close t={t} />

        {/* film grain + vignette */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, transparent 55%, rgba(0,0,0,.55))" }} />
        {hud && (
          <div className="absolute inset-x-[6cqw] bottom-[4cqw] h-[0.5cqw] overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white/50" style={{ width: `${Math.min(100, (t / FILM_SECONDS) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
