import {
  CheckIcon,
  PaperPlaneIcon,
  RetryIcon,
  SpinnerIcon,
  WarningIcon,
} from "@/app/components/icons";
import { feed } from "./mock-data";

const ICONS = {
  spinner: SpinnerIcon,
  retry: RetryIcon,
  check: CheckIcon,
  warning: WarningIcon,
  "paper-plane": PaperPlaneIcon,
};

export function LiveActivityFeed() {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-divider bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="mr-auto text-[11px] uppercase tracking-wide text-fg/45">
          Live activity
        </span>
        <span className="h-[7px] w-[7px] rounded-full bg-accent-500 shadow-[0_0_9px_var(--color-accent-500)]" />
        <span className="text-[10.5px] text-fg/45">polling 3s</span>
      </div>
      {feed.map((ev, i) => {
        const Icon = ICONS[ev.icon];
        return (
          <div key={i} className="flex gap-2.5 border-t border-white/[0.08] py-2 first:border-t-0">
            <Icon className="mt-0.5 h-[15px] w-[15px] shrink-0 text-fg/45" />
            <div className="min-w-0">
              <div className="text-[12.5px] leading-snug text-fg/85">{ev.text}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-fg/40">{ev.meta}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
