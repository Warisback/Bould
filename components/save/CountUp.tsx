"use client";

import { useEffect, useState } from "react";

/** Counts from 0 to `value` with an ease-out, after a short delay. Instant with reduced motion. */
export function useCountUp(value: number, { duration = 900, delay = 180 } = {}): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = reduce ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, reduce ? 0 : delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return shown;
}
