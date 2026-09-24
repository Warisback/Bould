"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  const onReview = pathname === "/" || pathname.startsWith("/review") || pathname.startsWith("/climb");
  const onBoard = pathname.startsWith("/gym");
  const onProfile = pathname.startsWith("/profile") || pathname.startsWith("/why");

  const tab = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-1 pt-3 text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-md items-start">
        <Link href="/gym/aldgate" className={tab(onBoard)}>
          <TrophyIcon />
          Leaderboard
        </Link>

        <div className="flex flex-1 justify-center">
          <Link
            href="/"
            aria-label="Review"
            className={`-mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-brand shadow-[0_8px_24px_rgb(252_76_2/0.45)] ring-4 ring-bg transition active:scale-95 ${onReview ? "" : "opacity-95"}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white">
              <span className="h-3.5 w-3.5 rounded-full bg-white" />
            </span>
          </Link>
          <span className={`absolute bottom-1.5 text-[11px] font-medium ${onReview ? "text-brand" : "text-muted"}`}>
            Review
          </span>
        </div>

        <Link href="/profile" className={tab(onProfile)}>
          <PersonIcon />
          Profile
        </Link>
      </div>
    </nav>
  );
}
