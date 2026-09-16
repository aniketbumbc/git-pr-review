"use client";

import { useMemo, useState } from "react";
import { PlayIcon, RefreshIcon, SearchIcon } from "@/app/components/icons";
import {
  dateRangeOptions,
  repoOptions,
  reviews,
  stats,
  verdictFilters,
  type Verdict,
} from "./mock-data";
import { StatCard } from "./stat-card";
import { TriggerPanel } from "./trigger-panel";
import { VerdictBadge } from "./verdict-badge";
import { LiveActivityFeed } from "./live-activity-feed";
import { VerdictMixCard } from "./verdict-mix-card";

const FILTER_TO_VERDICT: Record<(typeof verdictFilters)[number], Verdict | null> = {
  All: null,
  "Request changes": "REQUEST_CHANGES",
  Approve: "APPROVE",
  Comment: "COMMENT",
};

export function DashboardView() {
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof verdictFilters)[number]>("All");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const targetVerdict = FILTER_TO_VERDICT[filter];
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesVerdict = targetVerdict === null || r.verdict === targetVerdict;
      const matchesSearch =
        q === "" || r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q);
      return matchesVerdict && matchesSearch;
    });
  }, [filter, search]);

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
            className="flex h-9 items-center gap-1.5 rounded-md border border-divider px-3.5 text-[13px] text-fg/80 transition-colors hover:border-fg/25"
          >
            <RefreshIcon className="h-[15px] w-[15px]" />
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

      {triggerOpen && <TriggerPanel />}

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
                placeholder="Search PR title or author"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-divider bg-bg pl-8 pr-2.5 text-[13px] outline-none focus:border-accent-500"
              />
            </div>
            <select className="h-9 flex-[0_1_190px] rounded-md border border-divider bg-bg px-2.5 text-[13px] outline-none">
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
            <select className="h-9 flex-[0_1_140px] rounded-md border border-divider bg-bg px-2.5 text-[13px] outline-none">
              {dateRangeOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

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
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13.5px] text-fg/90">{r.title}</span>
                      <span className="font-mono text-[11px] text-fg/40">
                        {r.slug} · {r.author}
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
              {rows.length === 0 && (
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
              Showing {rows.length} of 214 reviews
            </span>
            <button
              type="button"
              className="ml-auto rounded-md border border-divider px-3 py-1.5 text-[12.5px] text-fg/70 transition-colors hover:border-fg/25"
            >
              Load more
            </button>
          </div>
        </div>

        <aside className="flex min-w-[250px] flex-[0_1_290px] flex-col gap-3.5">
          <LiveActivityFeed />
          <VerdictMixCard />
        </aside>
      </div>
    </div>
  );
}
