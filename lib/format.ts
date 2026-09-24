const THIN_SPACE = " ";

/** 12400 -> "12 400" with a thin space, the way climbing apps print big numbers. */
export function formatThousands(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  return n < 0 ? `-${grouped}` : grouped;
}

/** "+14", "-9", "±0" */
export function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "±0";
}

/** Text colour for a rating change. */
export function changeColor(n: number): string {
  if (n > 0) return "text-good";
  if (n < 0) return "text-blunder";
  return "text-muted";
}

/** "just now", "5m ago", "3h ago", "yesterday", "4d ago", "12 Sep" */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function initial(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function gradeLabel(grade: number): string {
  return `V${grade}`;
}
