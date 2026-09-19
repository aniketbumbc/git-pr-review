import { NavBar } from "@/app/components/nav-bar";
import { fetchReviews } from "@/app/lib/api";
import { toReviewDetail } from "@/app/reviews/[id]/mock-data";
import { ReviewPageBody } from "@/app/reviews/[id]/review-page-body";

export default async function RunsPage() {
  const latest = await fetchReviews({ limit: 1, offset: 0 });
  const apiReview = latest.data[0];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="runs" />
      {apiReview ? (
        <ReviewPageBody review={toReviewDetail(apiReview)} />
      ) : (
        <div className="mx-auto max-w-[1240px] px-8 pb-16">
          <div className="mt-16 rounded-lg border border-divider bg-surface px-6 py-10 text-center text-[13px] text-fg/55">
            No reviews yet.
          </div>
        </div>
      )}
    </div>
  );
}
