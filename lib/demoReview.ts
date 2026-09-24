import type { Move, Review } from "./types";

/**
 * Demo reviews: instant, believable coaching for any video, so a live demo
 * never waits on (or fails because of) Gemini. Times are fractions of the
 * video (0-1) and get mapped onto the real duration.
 */
interface Template {
  sent: boolean;
  accuracy: number;
  summary: string;
  crux: { f: number; what_went_wrong: string; try_this: string } | null;
  moves: (Omit<Move, "t"> & { f: number })[];
}

const TEMPLATES: Template[] = [
  {
    sent: false,
    accuracy: 61.4,
    summary:
      "Solid start, but you climbed the middle on your arms. Your hips drifted off the wall, your feet got lazy, and by the crux there was nothing left in the tank. This is a technique fall, not a strength one.",
    crux: {
      f: 0.78,
      what_went_wrong:
        "You reached with a bent left arm and your hips hanging off the wall. Your feet were too low to push from, so the move was all pull. You cut loose and came off.",
      try_this:
        "Step your right foot up first, turn your hip in, and reach from a straight arm. Let your legs make the distance, not your biceps.",
    },
    moves: [
      { f: 0.06, move: "Pull on, both feet set on the start holds", rating: "good", why: "Calm start. Weight on your feet before you pull.", better: null, send_chance: 64 },
      { f: 0.16, move: "Right hand up to the crimp, straight arm", rating: "great", why: "Straight arm, hips close, no wasted movement. This is how the whole climb should look.", better: null, send_chance: 68 },
      { f: 0.27, move: "High left foot, rock over", rating: "good", why: "Good commitment to the high foot. You trusted it and moved your weight over it.", better: null, send_chance: 69 },
      { f: 0.38, move: "Readjust feet twice before the next reach", rating: "inaccuracy", why: "Two foot shuffles on the same hold. Each one costs grip and time.", better: "Look at your foot until it lands, place it once, and move on.", send_chance: 60 },
      { f: 0.49, move: "Left hand to the sloper, arms bent", rating: "mistake", why: "Hips swung out as you reached. Bent arms held you on, which burns forearm fast.", better: "Drop your hips and turn your left hip into the wall before reaching. Hang off straight arms.", send_chance: 47 },
      { f: 0.6, move: "Pause to chalk while hanging on the sloper", rating: "inaccuracy", why: "You stopped on the worst hold on the climb to chalk up. That pause cost more than it gave.", better: "Chalk on the good crimp before the sloper, or keep moving through.", send_chance: 38 },
      { f: 0.7, move: "Flag right leg to control the swing", rating: "good", why: "Nice flag. It stopped the barn door and bought you a second.", better: null, send_chance: 36 },
      { f: 0.78, move: "Throw for the top from low feet", rating: "blunder", why: "Feet too low, bent arm, hips off the wall. It became a jump you couldn't hold.", better: "Walk your right foot up to the volume first, then reach statically from a straight arm.", send_chance: 4 },
    ],
  },
  {
    sent: false,
    accuracy: 57.8,
    summary:
      "You rushed the bottom and hesitated at the top, which is the wrong way round. Quiet feet were missing all the way up. The good news: your body positions were mostly right, so this is very fixable.",
    crux: {
      f: 0.72,
      what_went_wrong:
        "You hesitated for ages below the crux, over-gripped, then went for it half-committed. Your left foot skated because you weren't pushing through it.",
      try_this:
        "Decide the move before you leave the ground. When you get there, sink low, push hard through your left toe and commit fully. Half a jump is worse than a full one.",
    },
    moves: [
      { f: 0.05, move: "Start holds, sit start", rating: "good", why: "Tight body on the sit start. Good.", better: null, send_chance: 58 },
      { f: 0.15, move: "Right hand to the pinch, fast", rating: "inaccuracy", why: "You slapped it. Moving that quickly on easy ground means you're not reading the next move.", better: "Move smoothly on the easy bit and use it to plan the crux.", send_chance: 55 },
      { f: 0.26, move: "Left heel hook on the volume", rating: "brilliant", why: "Great spot. The heel took weight off your arms and set up the next reach perfectly.", better: null, send_chance: 66 },
      { f: 0.38, move: "Noisy foot placement on the smear", rating: "mistake", why: "Your foot slapped on and slipped a centimetre. You caught it, but it shook your balance.", better: "Quiet feet: place the toe, press, then weight it. Listen for silence.", send_chance: 52 },
      { f: 0.5, move: "Drop knee to reach the undercling", rating: "great", why: "Textbook drop knee. Hips in, arm straight, long reach for free.", better: null, send_chance: 57 },
      { f: 0.62, move: "Long hesitation below the crux", rating: "inaccuracy", why: "Several seconds hanging and looking. Your grip was draining while you decided.", better: "Rest on the undercling with straight arms, or commit sooner.", send_chance: 41 },
      { f: 0.72, move: "Half-committed deadpoint to the edge", rating: "blunder", why: "You went, but not all the way. Left foot skated, hand hit the hold and bounced off.", better: "Sink low, push through the left toe, and commit the whole move.", send_chance: 3 },
    ],
  },
  {
    sent: true,
    accuracy: 78.6,
    summary:
      "Sent, and mostly clean. Your footwork was the best part: precise and quiet. You lost a bit of efficiency with bent arms in the middle, which could cost you on something harder.",
    crux: null,
    moves: [
      { f: 0.06, move: "Pull on, feet high and tight", rating: "good", why: "Good body tension from the first move.", better: null, send_chance: 72 },
      { f: 0.17, move: "Left hand crimp, right foot smear", rating: "great", why: "Precise smear, hips in. Very efficient.", better: null, send_chance: 76 },
      { f: 0.29, move: "Bent-arm lock-off to the side pull", rating: "inaccuracy", why: "Locking off burns energy you'll want later.", better: "Turn your hip in and reach from a straight arm instead of pulling up.", send_chance: 71 },
      { f: 0.41, move: "Right heel hook, rock over", rating: "great", why: "Heel took the weight off your arms. Smart.", better: null, send_chance: 78 },
      { f: 0.53, move: "Shake out on the jug", rating: "good", why: "Good call to rest here. Straight arms while you shook out.", better: null, send_chance: 80 },
      { f: 0.65, move: "Flag left, reach the sloper", rating: "brilliant", why: "The flag kept you perfectly balanced. Not the obvious move, but the right one.", better: null, send_chance: 86 },
      { f: 0.77, move: "Feet cut on the final reach", rating: "mistake", why: "You cut feet and swung. You held it, but it was close.", better: "Keep your toes on and press into the wall until your hand is on the finish.", send_chance: 74 },
      { f: 0.88, move: "Match the top, controlled", rating: "good", why: "Matched with control. Sent.", better: null, send_chance: 100 },
    ],
  },
];

function scale(f: number, duration: number): number {
  return Math.round(Math.min(duration, Math.max(0, f * duration)) * 10) / 10;
}

/** A believable review of any video, timed to its length. */
export function makeDemoReview(duration: number, pick = Math.random()): Review {
  const d = Number.isFinite(duration) && duration > 0 ? duration : 20;
  // Falls are twice as likely: people demo a scrappy attempt.
  const order = [0, 1, 0, 2, 1];
  const t = TEMPLATES[order[Math.floor(pick * order.length) % order.length]];
  // Small jitter so two demos don't look identical.
  const jitter = Math.round((pick * 10 - 5) * 10) / 10;
  const accuracy = Math.max(35, Math.min(95, Math.round((t.accuracy + jitter) * 10) / 10));
  return {
    sent: t.sent,
    accuracy,
    summary: t.summary,
    crux: t.crux ? { t: scale(t.crux.f, d), what_went_wrong: t.crux.what_went_wrong, try_this: t.crux.try_this } : null,
    moves: t.moves.map(({ f, ...m }) => ({ ...m, t: scale(f, d) })),
  };
}
