import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/leaderboard/Leaderboard";
import { isLeaderboardTab } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "Aldgate leaderboard · Beta Review",
};

export default async function GymPage({
  params,
  searchParams,
}: {
  params: Promise<{ gym: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { gym } = await params;
  if (gym !== "aldgate") notFound();
  const { tab } = await searchParams;
  return <Leaderboard gym="aldgate" initialTab={isLeaderboardTab(tab) ? tab : "points"} />;
}
