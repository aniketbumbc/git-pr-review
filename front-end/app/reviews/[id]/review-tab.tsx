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
        {review.criticalFixes.length === 0 ? (
          <p className="m-0 text-[13.5px] text-fg/45">No blocking issues found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {review.criticalFixes.map((fix) => (
              <div
                key={fix.num}
                className="flex gap-3 rounded-r-md border-l-2 border-l-warn-400 bg-surface px-4 py-3"
              >
                <span className="mt-0.5 font-mono text-[11px] text-fg/40">{fix.num}</span>
                <p className="m-0 max-w-[70ch] text-[13.5px] leading-relaxed text-fg/85">{fix.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-baseline gap-2.5">
          <h6 className="m-0 text-[11px] uppercase tracking-wide text-fg/50">Suggestions</h6>
          <span className="font-mono text-[11px] text-fg/35">
            {review.suggestions.length} non-blocking
          </span>
        </div>
        {review.suggestions.length === 0 ? (
          <p className="m-0 text-[13.5px] text-fg/45">No suggestions.</p>
        ) : (
          <div className="flex flex-col">
            {review.suggestions.map((s, i) => (
              <div key={i} className="flex gap-3 border-t border-white/[0.08] py-2.5 first:border-t-0">
                <span className="mt-1 text-accent-500">›</span>
                <div className="text-sm leading-snug text-fg/85">{s.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
