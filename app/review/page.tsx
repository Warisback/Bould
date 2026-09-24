import type { Metadata } from "next";
import ReviewFlow from "@/components/upload/ReviewFlow";

export const metadata: Metadata = {
  title: "Review my climb · Beta Review",
};

export default function ReviewUploadPage() {
  return <ReviewFlow />;
}
