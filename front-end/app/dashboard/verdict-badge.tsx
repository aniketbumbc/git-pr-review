import { SpinnerIcon } from "@/app/components/icons";
import type { Verdict } from "./mock-data";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-accent-300">
        <SpinnerIcon className="h-3.5 w-3.5" />
        reviewing…
      </span>
    );
  }

  const styles: Record<Exclude<Verdict, "PENDING">, string> = {
    APPROVE: "border border-accent-500/60 text-accent-400",
    REQUEST_CHANGES: "border border-warn-400 text-warn-300",
    COMMENT: "border border-[#6b7080]/60 text-[#9497a3]",
  };

  const labels: Record<Exclude<Verdict, "PENDING">, string> = {
    APPROVE: "APPROVE",
    REQUEST_CHANGES: "REQUEST CHANGES",
    COMMENT: "COMMENT",
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] tracking-wider ${styles[verdict]}`}
    >
      {labels[verdict]}
    </span>
  );
}
