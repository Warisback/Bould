import type { Metadata } from "next";
import JoinForm from "@/components/join/JoinForm";

export const metadata: Metadata = {
  title: "Join your gym · Beta Review",
};

/** Only same-site paths, never back to /join or an API route. */
function safeNext(v: string | string[] | undefined): string {
  const next = Array.isArray(v) ? v[0] : v;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/join" || next.startsWith("/join?") || next.startsWith("/api")) return "/";
  return next;
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { next } = await searchParams;
  return <JoinForm next={safeNext(next)} />;
}
