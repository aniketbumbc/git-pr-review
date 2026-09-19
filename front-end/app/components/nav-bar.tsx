import Link from "next/link";

const NAV_ITEMS = [
  { label: "Dashboard", key: "dashboard", href: "/dashboard" as string | null },
  { label: "Runs", key: "runs", href: "/runs" as string | null },
  { label: "About", key: "about", href: "/about" as string | null },
  // { label: "Repos", key: "repos", href: null },
  // { label: "Settings", key: "settings", href: null },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function NavBar({ active }: { active: NavKey }) {
  return (
    <header>
      <div className="flex items-center gap-6 px-8 py-3.5 max-w-[1240px] mx-auto">
        <div className="flex items-center gap-2.5 mr-auto">
          <div className="h-4 w-4 rounded-[3px] border border-accent-500 shadow-[0_0_12px_rgba(79,187,125,0.45)]" />
          <span className="font-medium text-[15px] tracking-tight text-accent-400">Auto ReviewPR</span>
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;

          if (!item.href) {
            return (
              <span
                key={item.key}
                className={`cursor-pointer text-[13px] ${isActive ? "text-accent-400" : "text-fg/60"}`}
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={
                isActive
                  ? "cursor-pointer text-[13px] text-accent-400"
                  : "cursor-pointer text-[13px] text-fg/60 transition-colors hover:text-fg"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
