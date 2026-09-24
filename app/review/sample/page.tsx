import type { Metadata } from "next";
import ReviewScreen from "@/components/review/ReviewScreen";
import RememberReview from "@/components/review/RememberReview";
import SaveToProfile from "@/components/save/SaveToProfile";
import type { Review } from "@/lib/types";
import sample from "@/public/sample.json";

export const metadata: Metadata = {
  title: "Sample climb · Beta Review",
};

const review = sample as Review;

export default function SampleReviewPage() {
  return (
    <>
      <RememberReview review={review} source="sample" />
      <ReviewScreen
        review={review}
        subtitle="Sample climb · a V4 fall at Aldgate"
        footer={<SaveToProfile review={review} defaultGrade={4} defaultType="project" />}
      />
    </>
  );
}
