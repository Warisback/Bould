import { memo, useId, useMemo } from "react";
import { RATING_META } from "@/lib/ratings";
import type { Move } from "@/lib/types";

/*
 * "Virtual playback": an abstract gym wall with the route's holds, and a marker
 * that climbs from hold to hold in time with the review's moves. Used when there
 * is no video (the sample, or a reopened review).
 */

const W = 300;
const H = 400;
const FLOOR_Y = 376;

interface Point {
  x: number;
  y: number;
}

interface Hold extends Point {
  rx: number;
  ry: number;
  rot: number;
}

/** Tiny deterministic PRNG (integer maths, so server and client agree exactly). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function routeHolds(count: number): Hold[] {
  const rand = mulberry32(4242 + count);
  // Keep clear of the move caption overlaid along the top edge.
  const top = 108;
  const bottom = 340;
  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? H / 2 : bottom - (i * (bottom - top)) / (count - 1);
    const side = i % 2 === 0 ? -1 : 1;
    const x = Math.min(246, Math.max(54, W / 2 + side * (26 + rand() * 46)));
    return {
      x: r1(x),
      y: r1(y + (rand() - 0.5) * 10),
      rx: r1(9 + rand() * 6),
      ry: r1(6 + rand() * 4),
      rot: Math.round(rand() * 180),
    };
  });
}

const DECOR_COLOURS = ["#3a4150", "#4b3a3a", "#3a4a3f", "#4a4230", "#40374f", "#2f4447"];

function decorHolds(route: Hold[]): (Hold & { fill: string })[] {
  const rand = mulberry32(99);
  const out: (Hold & { fill: string })[] = [];
  for (let i = 0; i < 60 && out.length < 22; i++) {
    const x = 18 + rand() * (W - 36);
    const y = 24 + rand() * (FLOOR_Y - 48);
    const rx = 4 + rand() * 7;
    const ry = 3 + rand() * 5;
    const rot = Math.round(rand() * 180);
    const fill = DECOR_COLOURS[Math.floor(rand() * DECOR_COLOURS.length)];
    const clash = [...route, ...out].some((h) => Math.hypot(h.x - x, h.y - y) < 30);
    if (!clash) out.push({ x: r1(x), y: r1(y), rx: r1(rx), ry: r1(ry), rot, fill });
  }
  return out;
}

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeIn = (p: number) => p * p * p;
const lerp = (a: Point, b: Point, p: number): Point => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });

/** Marker position as a pure function of time. */
function markerAt(moves: readonly Move[], holds: Hold[], time: number, sent: boolean): Point {
  if (holds.length === 0) return { x: W / 2, y: FLOOR_Y };
  const start: Point = { x: holds[0].x + 10, y: FLOOR_Y - 8 };
  let from = start;
  let fromT = 0;
  for (let i = 0; i < holds.length; i++) {
    const to = holds[i];
    const arrive = moves[i].t;
    if (time < arrive) {
      const leave = Math.max(fromT, arrive - 0.6);
      if (time <= leave) return from;
      return lerp(from, to, easeInOut((time - leave) / (arrive - leave)));
    }
    from = to;
    fromT = arrive;
  }
  if (!sent) {
    const dropStart = fromT + 0.25;
    const dropEnd = dropStart + 0.55;
    if (time > dropStart) {
      const p = Math.min(1, (time - dropStart) / (dropEnd - dropStart));
      return lerp(from, { x: from.x + 6, y: FLOOR_Y - 4 }, easeIn(p));
    }
  }
  return from;
}

const WallBackdrop = memo(function WallBackdrop({ holds }: { holds: Hold[] }) {
  const id = useId();
  const decor = useMemo(() => decorHolds(holds), [holds]);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1d21" />
          <stop offset="1" stopColor="#121214" />
        </linearGradient>
        <pattern id={`${id}-nuts`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.1" fill="#2a2a2f" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-wall)`} />
      <rect width={W} height={FLOOR_Y} fill={`url(#${id}-nuts)`} />
      {/* plywood panel seams */}
      <g stroke="#26262b" strokeWidth="1">
        <line x1="100" y1="0" x2="100" y2={FLOOR_Y} />
        <line x1="200" y1="0" x2="200" y2={FLOOR_Y} />
        <line x1="0" y1="125" x2={W} y2="125" />
        <line x1="0" y1="250" x2={W} y2="250" />
      </g>
      {/* volumes */}
      <g fill="#1f1f24" stroke="#2e2e34" strokeWidth="1.2" strokeLinejoin="round">
        <polygon points="196,196 258,214 250,276 186,258" />
        <polygon points="196,196 258,214 226,236" fill="#26262c" />
        <polygon points="34,84 90,70 104,118 54,134" />
        <polygon points="34,84 90,70 70,100" fill="#26262c" />
      </g>
      {/* other routes */}
      {decor.map((h, i) => (
        <ellipse
          key={i}
          cx={h.x}
          cy={h.y}
          rx={h.rx}
          ry={h.ry}
          fill={h.fill}
          transform={`rotate(${h.rot} ${h.x} ${h.y})`}
        />
      ))}
      {/* crash mat */}
      <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill="#18181b" />
      <line x1="0" y1={FLOOR_Y} x2={W} y2={FLOOR_Y} stroke="#303036" strokeWidth="1.5" />
    </g>
  );
});

function VirtualStage({
  moves,
  currentTime,
  currentIndex,
  sent,
}: {
  moves: readonly Move[];
  currentTime: number;
  currentIndex: number;
  sent: boolean;
}) {
  const holds = useMemo(() => routeHolds(moves.length), [moves.length]);
  const marker = markerAt(moves, holds, currentTime, sent);
  const trail = holds
    .slice(0, currentIndex + 1)
    .map((h) => `${h.x},${h.y}`)
    .concat(`${r1(marker.x)},${r1(marker.y)}`)
    .join(" ");
  const current = currentIndex >= 0 ? holds[currentIndex] : null;
  const currentColour = currentIndex >= 0 ? RATING_META[moves[currentIndex].rating].color : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <WallBackdrop holds={holds} />

      {currentIndex >= 0 && (
        <polyline
          points={trail}
          fill="none"
          stroke="rgb(255 255 255 / 0.22)"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      )}

      {holds.map((h, i) => {
        const done = i <= currentIndex;
        return (
          <g key={i}>
            <ellipse
              cx={h.x}
              cy={h.y}
              rx={h.rx}
              ry={h.ry}
              transform={`rotate(${h.rot} ${h.x} ${h.y})`}
              fill={done ? RATING_META[moves[i].rating].color : "#b9b9c1"}
              fillOpacity={done ? 0.95 : 0.8}
              style={{ transition: "fill 300ms ease" }}
            />
            <circle cx={h.x} cy={h.y} r="1.6" fill="#0b0b0c" fillOpacity="0.55" />
          </g>
        );
      })}

      {current && (
        <circle
          key={currentIndex}
          cx={current.x}
          cy={current.y}
          r="20"
          fill="none"
          stroke={currentColour}
          strokeWidth="2"
          className="animate-pop-in"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      )}

      <circle cx={marker.x} cy={marker.y} r="15" fill="#fff" fillOpacity="0.1" />
      <circle cx={marker.x} cy={marker.y} r="6.5" fill="#fff" stroke="#0b0b0c" strokeWidth="1.5" />
    </svg>
  );
}

export default VirtualStage;
