import type { CSSProperties } from "react";

/** Aspect used for the virtual stage, and for a video until its metadata loads. */
export const DEFAULT_ASPECT = 3 / 4;

/**
 * Tallest the stage may be so the header, stage, timeline and controls all fit
 * above the bottom nav (and its raised Review button) on a phone with the
 * browser toolbars showing: 100svh minus header 56 + gap 16 + timeline 44 +
 * gaps 16 + controls 48 + nav 65 + button overhang 28 + breathing room.
 */
export const STAGE_CAP =
  "max(15rem, calc(100svh - 18rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)))";

/**
 * Size for the stage box, which sits beside the 1.5rem send bar and a 0.5rem gap.
 * It shrinks in both directions under the cap so the picture keeps its aspect
 * and nothing (start holds, crash mat, the fall) is ever cropped.
 */
export function stageBoxStyle(aspect: number): CSSProperties {
  return {
    aspectRatio: aspect,
    width: `min(calc(100% - 2rem), calc(${STAGE_CAP} * ${aspect.toFixed(4)}))`,
    maxHeight: STAGE_CAP,
  };
}
