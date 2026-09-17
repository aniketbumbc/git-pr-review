import { FileCodeIcon } from "@/app/components/icons";
import type { ReviewDetail } from "./mock-data";

export function ReviewTab({ review }: { review: ReviewDetail }) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h6 className="mb-2.5 text-[11px] uppercase tracking-wide text-fg/50">Summary</h6>
        <div className="flex flex-col gap-2.5">
          {review.summary.map((p, i) => (
            <p key={i} className="max-w-[68ch] text-[15px] leading-relaxed text-fg/90 text-pretty">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline gap-2.5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-warn-400">Critical fixes</h6>
          <span className="font-mono text-[11px] text-fg/45">
            {review.criticalFixes.length} blocking
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {review.criticalFixes.map((fix) => (
            <div
              key={fix.num}
              className="flex flex-col gap-2 rounded-lg border border-divider border-l-2 border-l-warn-400 bg-surface px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[11px] text-fg/40">{fix.num}</span>
                <span className="text-[15px] font-medium">{fix.title}</span>
                <span className="ml-auto rounded border border-warn-400 px-2 py-0.5 text-[10px] tracking-wider text-warn-300">
                  {fix.severity}
                </span>
              </div>
              <p className="m-0 max-w-[70ch] text-[13.5px] leading-relaxed text-fg/70">{fix.body}</p>
              <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-warn-300">
                <FileCodeIcon className="h-3.5 w-3.5" />
                {fix.loc}
              </div>
              <div className="overflow-x-auto rounded-md bg-black/30 px-3 py-2 font-mono text-[12px] leading-relaxed text-fg/80">
                {fix.code}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline gap-2.5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-fg/50">Suggestions</h6>
          <span className="font-mono text-[11px] text-fg/35">
            {review.suggestions.length} non-blocking
          </span>
        </div>
        <div className="flex flex-col">
          {review.suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 border-t border-white/[0.08] py-2.5 first:border-t-0">
              <span className="mt-1 text-accent-500">›</span>
              <div className="min-w-0">
                <div className="text-sm leading-snug text-fg/85">{s.text}</div>
                <div className="mt-0.5 font-mono text-[11px] text-fg/40">{s.loc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
