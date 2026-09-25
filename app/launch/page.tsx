import type { Metadata } from "next";
import LaunchFilm from "@/components/launch/LaunchFilm";

export const metadata: Metadata = { title: "Beta Review · Launch film" };

export default function LaunchPage() {
  return <LaunchFilm />;
}
