import type { VerdictMixItem } from "./mock-data";

export function VerdictMixCard({ verdictMix }: { verdictMix: VerdictMixItem[] }) {
  const hasData = verdictMix.some((m) => m.count > 0);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-surface p-4">
      <span className="text-[11px] uppercase tracking-wide text-fg/45">Verdict mix · 7 days</span>
      {!hasData && (
        <span className="text-xs text-fg/45">No reviews in the last 7 days</span>
      )}
      {hasData && verdictMix.map((m) => (
        <div key={m.label} className="flex flex-col gap-1">
          <div className="flex text-xs">
            <span className="text-fg/70">{m.label}</span>
            <span className="ml-auto font-mono text-fg/50">{m.count}</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className="block h-full rounded-full"
              style={{ width: m.pct, background: m.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
