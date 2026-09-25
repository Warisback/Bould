"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getUserId } from "@/lib/storage";

/** Pages anyone can open without joining a gym first. */
const OPEN_PATHS = ["/join", "/review/sample", "/why", "/launch", "/api"];

function isOpen(path: string) {
  return OPEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** First visit: send climbers without a profile to /join, then back to where they were going. Renders nothing. */
export default function JoinGate() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    if (isOpen(pathname) || getUserId()) return;
    const next = `${pathname}${window.location.search}`;
    router.replace(`/join?next=${encodeURIComponent(next)}`);
  }, [pathname, router]);

  return null;
}
