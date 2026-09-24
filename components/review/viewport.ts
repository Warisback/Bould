/**
 * The part of the window the climber can actually see: below the status bar
 * (safe-area inset) and above the fixed bottom nav.
 */
export function visibleArea(): { top: number; bottom: number } {
  const nav = document.querySelector("body > nav");
  const bottom = nav ? nav.getBoundingClientRect().top : window.innerHeight;
  // <main> is padded by env(safe-area-inset-top); its computed padding is that inset in px.
  const main = document.querySelector("body > main");
  const top = main ? parseFloat(getComputedStyle(main).paddingTop) || 0 : 0;
  return { top, bottom };
}

export function isFullyVisible(el: Element): boolean {
  const { top, bottom } = visibleArea();
  const r = el.getBoundingClientRect();
  return r.top >= top && r.bottom <= bottom;
}

/**
 * Runs `fn` once the page has stopped scrolling: on `scrollend`, or after
 * `fallbackMs` where that event isn't supported (older iOS Safari).
 * Returns a cancel function.
 */
export function afterScroll(fn: () => void, fallbackMs = 700): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cancel();
    fn();
  };
  const timer = window.setTimeout(run, fallbackMs);
  window.addEventListener("scrollend", run, { once: true });
  function cancel() {
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener("scrollend", run);
  }
  return cancel;
}
