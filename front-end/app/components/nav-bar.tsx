const NAV_ITEMS = [
  { label: "Dashboard", key: "dashboard" },
  { label: "Runs", key: "runs" },
  { label: "Repos", key: "repos" },
  { label: "Settings", key: "settings" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function NavBar({ active }: { active: NavKey }) {
  return (
    <div className="flex items-center gap-6 px-8 py-3.5 max-w-[1240px] mx-auto">
      <div className="flex items-center gap-2.5 mr-auto">
        <div className="h-4 w-4 rounded-[3px] border border-accent-500 shadow-[0_0_12px_rgba(79,187,125,0.45)]" />
        <span className="font-medium text-[15px] tracking-tight">Sentry Review</span>
      </div>
      {NAV_ITEMS.map((item) => (
        <span
          key={item.key}
          className={
            item.key === active
              ? "text-[13px] text-accent-400"
              : "text-[13px] text-fg/60 cursor-default"
          }
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
