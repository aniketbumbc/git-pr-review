import { NavBar } from "@/app/components/nav-bar";
import { fetchReviewStats, fetchReviews } from "@/app/lib/api";
import {
  FILTER_TO_VERDICT,
  REVIEWS_PAGE_SIZE,
  buildStats,
  repoOptions,
  verdictFilters,
} from "./mock-data";
import { DashboardView } from "./dashboard-view";

type DashboardSearchParams = {
  filter?: string;
  search?: string;
  repo?: string;
  page?: string;
};

function parseFilter(value: string | undefined): (typeof verdictFilters)[number] {
  return (verdictFilters as readonly string[]).includes(value ?? "")
    ? (value as (typeof verdictFilters)[number])
    : "All";
}

function parseRepo(value: string | undefined): string {
  return value && repoOptions.includes(value) ? value : repoOptions[0];
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const repo = parseRepo(params.repo);
  const search = params.search?.trim() || undefined;
  const page = parsePage(params.page);
  const offset = (page - 1) * REVIEWS_PAGE_SIZE;

  const [initialReviews, reviewStats] = await Promise.all([
    fetchReviews({
      limit: REVIEWS_PAGE_SIZE,
      offset,
      repo: repo === repoOptions[0] ? undefined : repo,
      verdict: FILTER_TO_VERDICT[filter] ?? undefined,
      search,
    }),
    fetchReviewStats(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="dashboard" />
      <DashboardView
        initialReviews={initialReviews.data}
        initialTotal={initialReviews.total}
        initialLimit={initialReviews.limit}
        initialOffset={initialReviews.offset}
        initialFilter={filter}
        initialSearch={params.search ?? ""}
        initialRepo={repo}
        stats={buildStats(reviewStats)}
      />
    </div>
  );
}
