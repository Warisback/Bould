import Link from "next/link";
import type { ReactNode } from "react";
import PageHeader from "@/components/review/PageHeader";

const ICONS = {
  offline: (
    <>
      <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01" />
      <path d="m3 3 18 18" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10.5 5-3v9l-5-3M3 3l18 18" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6c1.6 0 3 .4 4.3 1M22 12s-1.3 2.2-3.8 3.9M12 18c-6.5 0-10-6-10-6" />
      <path d="m3 3 18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
};

/** Full-page card for the "that didn't work" states, with actions underneath. */
export default function NoticeCard({
  icon,
  tone = "blunder",
  title,
  children,
  actions,
  showSample = true,
  extraLink,
}: {
  icon: keyof typeof ICONS;
  tone?: "blunder" | "inaccuracy";
  title: string;
  children: ReactNode;
  actions: ReactNode;
  showSample?: boolean;
  /** shown before the sample link, e.g. a "Start over" button */
  extraLink?: ReactNode;
}) {
  const toneCls = tone === "blunder" ? "bg-blunder/15 text-blunder" : "bg-inaccuracy/15 text-inaccuracy";
  return (
    <div className="px-4 pb-6">
      <PageHeader title="Review my climb" />
      <section className="mt-2 rounded-3xl bg-surface p-6 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${toneCls}`}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {ICONS[icon]}
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
        <div className="mt-2 text-[15px] leading-relaxed text-muted">{children}</div>

        <div className="mt-6 space-y-3">{actions}</div>

        <div className="flex items-center justify-center gap-1 pt-3 text-[15px]">
          {extraLink}
          {extraLink && showSample && <span className="text-faint">·</span>}
          {showSample && (
            <Link href="/review/sample" className="flex h-11 items-center px-3 font-semibold text-brand">
              See a sample review
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
