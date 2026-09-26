import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import LaunchFilm from "@/components/launch/LaunchFilm";

const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: "Beta Review · Launch film" };

export default function LaunchPage() {
  return <LaunchFilm fontFamily={urbanist.style.fontFamily} />;
}
