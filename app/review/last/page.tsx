import type { Metadata } from "next";
import LastReviewView from "@/components/review/LastReviewView";

export const metadata: Metadata = {
  title: "Last review · Beta Review",
};

export default function LastReviewPage() {
  return <LastReviewView />;
}
