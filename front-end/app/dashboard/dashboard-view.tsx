"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayIcon, RefreshIcon, SearchIcon, WarningIcon } from "@/app/components/icons";
import { RunTimeline } from "@/app/components/run-timeline";
import { fetchReviews, fetchRunByEvent, type ApiReview, type ReviewsEnvelope } from "@/app/lib/api";
import {
  FILTER_TO_VERDICT,
  REVIEWS_PAGE_SIZE,
  dateRangeOptions,
  repoOptions,
  toReviewViewModel,
  verdictFilters,
  type DashboardStat,
  type VerdictMixItem,
} from "./mock-data";
import { StatCard } from "./stat-card";
import { TriggerPanel } from "./trigger-panel";
import { VerdictBadge } from "./verdict-badge";
import { LiveActivityFeed } from "./live-activity-feed";
import { VerdictMixCard } from "./verdict-mix-card";

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_ROW_COUNT = 5;

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.06]">
      <td className="py-2.5">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-3/5 animate-pulse rounded bg-white/10" />
          <div className="h-2.5 w-2/5 animate-pulse rounded bg-white/5" />
        </div>
      </td>
      <td className="py-2.5">
        <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
      </td>
      <td className="py-2.5 text-right">
        <div className="ml-auto h-3 w-6 animate-pulse rounded bg-white/10" />
      </td>
      <td className="py-2.5">
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      </td>
      <td className="py-2.5 text-right">
        <div className="ml-auto h-3 w-14 animate-pulse rounded bg-white/10" />
      </td>
    </tr>
  );
}

function sinceFromDateRange(range: (typeof dateRangeOptions)[number]): string | undefined {
  if (range === "Last 7 days") {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (range === "Last 30 days") {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return undefined;
}

type DashboardViewProps = {
  initialReviews: ApiReview[];
  initialTotal: number;
  initialLimit: number;
  initialOffset: number;
  initialFilter: (typeof verdictFilters)[number];
  initialSearch: string;
  initialRepo: string;
  stats: DashboardStat[];
  verdictMix: VerdictMixItem[];
};

export function DashboardView({
  initialReviews,
  initialTotal,
  initialLimit,
  initialOffset,
  initialFilter,
  initialSearch,
  initialRepo,
  stats,
  verdictMix,
}: DashboardViewProps) {
  const trimmedInitialSearch = initialSearch.trim();
  const router = useRouter();

  const [triggerOpen, setTriggerOpen] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof verdictFilters)[number]>(initialFilter);
  const [searchInput, setSearchInput] = useState(trimmedInitialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(trimmedInitialSearch);
  const [repo, setRepo] = useState(initialRepo);
  // The initial server render never applies a date filter (see page.tsx), so
  // "All time" is the value that actually matches what's on screen at mount.
  const [dateRange, setDateRange] = useState<(typeof dateRangeOptions)[number]>("All time");

  const [rows, setRows] = useState(() => initialReviews.map(toReviewViewModel));
  const [total, setTotal] = useState(initialTotal);
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstRun = useRef(true);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadReviews = useCallback(
    (
      queryOffset: number,
      queryLimit: number = REVIEWS_PAGE_SIZE,
      signal?: AbortSignal,
    ): Promise<ReviewsEnvelope> => {
      return fetchReviews(
        {
          limit: queryLimit,
          offset: queryOffset,
          repo: repo === repoOptions[0] ? undefined : repo,
          verdict: FILTER_TO_VERDICT[filter] ?? undefined,
          search: debouncedSearch || undefined,
          since: sinceFromDateRange(dateRange),
        },
        { signal },
      );
    },
    [repo, filter, debouncedSearch, dateRange],
  );

  // Re-query from page 1 whenever a filter dimension changes. Skips the
  // mount-time run since the server-rendered rows already match this state.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loadReviews(0, REVIEWS_PAGE_SIZE, controller.signal)
      .then((envelope) => {
        setRows(envelope.data.map(toReviewViewModel));
        setTotal(envelope.total);
        setLimit(envelope.limit);
        setOffset(envelope.offset);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadReviews]);

  async function goToPage(page: number) {
    setLoading(true);
    setError(null);
    try {
      const envelope = await loadReviews((page - 1) * REVIEWS_PAGE_SIZE, REVIEWS_PAGE_SIZE);
      setRows(envelope.data.map(toReviewViewModel));
      setTotal(envelope.total);
      setLimit(envelope.limit);
      setOffset(envelope.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  // Re-fetches exactly what's currently on screen (same filters, same page)
  // without resetting scroll position, filters, or pagination.
  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const envelope = await loadReviews(offset, limit);
      setRows(envelope.data.map(toReviewViewModel));
      setTotal(envelope.total);
      setOffset(envelope.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh reviews");
    } finally {
      setRefreshing(false);
    }
  }

  const currentPage = Math.floor(offset / REVIEWS_PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-[1240px] px-8 pb-16">
      <div className="flex flex-wrap items-end gap-6 my-[26px]">
        <div className="min-w-0 flex-[1_1_380px]">
          <h1 className="m-0 text-2xl font-medium tracking-tight">PR reviews</h1>
          <p className="mt-1.5 text-[13.5px] text-fg/55">
            Every review is one durable Inngest run — pending results are honest, not hidden.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-9 items-center gap-1.5 rounded-md border border-divider px-3.5 text-[13px] text-fg/80 transition-colors hover:border-fg/25 disabled:opacity-50"
          >
            <RefreshIcon className={`h-[15px] w-[15px] ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setTriggerOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent-500 px-3.5 text-[13px] font-medium text-accent-900 transition-colors hover:bg-accent-400"
          >
            <PlayIcon className="h-[15px] w-[15px]" />
            Run review
          </button>
        </div>
      </div>

      {triggerOpen && <TriggerPanel onTriggered={setActiveEventId} />}

      {activeEventId && (
        <div className="mb-[22px] rounded-lg border border-divider bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="text-[11px] uppercase tracking-wide text-fg/45">Live run</span>
            <span className="ml-auto font-mono text-[11px] text-fg/40">{activeEventId}</span>
          </div>
          <RunTimeline
            pollKey={activeEventId}
            fetchProgress={() => fetchRunByEvent(activeEventId)}
            showLoadingStepper
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2.5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-[26px]">
        <div className="min-w-0 flex-[1_1_620px]">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-[1_1_220px]">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-[9px] h-[15px] w-[15px] text-fg/40" />
              <input
                type="text"
                placeholder="Search PR title"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 w-full rounded-md border border-divider bg-bg pl-8 pr-2.5 text-[13px] outline-none focus:border-accent-500"
              />
            </div>
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="h-9 flex-[0_1_190px] rounded-md border border-divider bg-bg px-2.5 text-[13px] outline-none"
            >
              {repoOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <div className="flex gap-0.5">
              {verdictFilters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={
                    f === filter
                      ? "rounded-md border border-accent-500 bg-accent-500/10 px-3 py-1.5 text-[12.5px] text-accent-200"
                      : "rounded-md border border-divider px-3 py-1.5 text-[12.5px] text-fg/60 transition-colors hover:text-fg"
                  }
                >
                  {f}
                </button>
              ))}
            </div>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as (typeof dateRangeOptions)[number])
              }
              className="h-9 flex-[0_1_140px] rounded-md border border-divider bg-bg px-2.5 text-[13px] outline-none"
            >
              {dateRangeOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-2.5 flex items-center gap-2 rounded-md border border-warn-400 bg-warn-400/10 px-3 py-2.5 text-[12.5px] text-warn-300">
              <WarningIcon className="h-4 w-4 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-divider text-[11px] uppercase tracking-wide text-fg/45">
                <th className="w-[44%] py-2 font-normal">Pull request</th>
                <th className="py-2 font-normal">Verdict</th>
                <th className="py-2 text-right font-normal">Critical</th>
                <th className="py-2 font-normal">Run</th>
                <th className="py-2 text-right font-normal">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: rows.length || SKELETON_ROW_COUNT }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              {!loading &&
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/reviews/${r.id}`)}
                    className="cursor-pointer border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] text-fg/90">{r.title}</span>
                        <span className="font-mono text-[11px] text-fg/40">
                          {r.author ? `${r.slug} · ${r.author}` : r.slug}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <VerdictBadge verdict={r.verdict} />
                    </td>
                    <td className="py-2.5 text-right font-mono text-[12.5px]">{r.critical}</td>
                    <td className="py-2.5 font-mono text-[11.5px] text-fg/55">{r.run}</td>
                    <td className="py-2.5 text-right text-xs text-fg/45">{r.when}</td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-fg/40">
                    No reviews match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 flex items-center gap-3 text-xs text-fg/45">
            <span>
              Showing {rows.length === 0 ? 0 : offset + 1}–{offset + rows.length} of {total} reviews
            </span>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={loading || currentPage <= 1}
                className="rounded-md border border-divider px-3 py-1.5 text-[12.5px] text-fg/70 transition-colors hover:border-fg/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="font-mono text-[12px] text-fg/55">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={loading || currentPage >= totalPages}
                className="rounded-md border border-divider px-3 py-1.5 text-[12.5px] text-fg/70 transition-colors hover:border-fg/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="flex min-w-[250px] flex-[0_1_290px] flex-col gap-3.5">
          {/* <LiveActivityFeed /> */}
          <VerdictMixCard verdictMix={verdictMix} />
        </aside>
      </div>
    </div>
  );
}
