import { notFound } from "next/navigation";
import { NavBar } from "@/app/components/nav-bar";
import { ApiError, fetchReview } from "@/app/lib/api";
import { toReviewDetail } from "./mock-data";
import { ReviewPageBody } from "./review-page-body";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewPageProps) {
  const { id } = await params;

  let apiReview;
  try {
    apiReview = await fetchReview(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const review = toReviewDetail(apiReview);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="runs" />
      <ReviewPageBody review={review} />
    </div>
  );
}
