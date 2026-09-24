import Link from "next/link";
import type { ReactNode } from "react";

/** Back link + title, with an optional one-line subtitle so notices don't cost stage height. */
export default function PageHeader({
  title,
  subtitle,
  backHref = "/",
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
}) {
  return (
    <header className="flex h-14 items-center gap-1">
      <Link
        href={backHref}
        aria-label="Back"
        className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:bg-surface"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      <div className="min-w-0">
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-[13px] leading-snug text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
