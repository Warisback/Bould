import Link from "next/link";

/** Back link + title, matching the header inside ReviewScreen. */
export default function PageHeader({ title, backHref = "/" }: { title: string; backHref?: string }) {
  return (
    <header className="flex h-14 items-center gap-1">
      <Link
        href={backHref}
        aria-label="Back"
        className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink transition active:bg-surface"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      <h1 className="text-lg font-bold">{title}</h1>
    </header>
  );
}
