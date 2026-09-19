"use client";

import { fetchReviewRun } from "@/app/lib/api";
import { RunTimeline } from "@/app/components/run-timeline";

export function RunTab({ reviewId }: { reviewId: string }) {
  return <RunTimeline pollKey={reviewId} fetchProgress={() => fetchReviewRun(reviewId)} />;
}
