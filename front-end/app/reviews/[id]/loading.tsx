import { NavBar } from "@/app/components/nav-bar";

export default function ReviewDetailLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="runs" />
      <div className="mx-auto max-w-[1240px] px-8 pb-16">
        <div className="my-4 h-3 w-40 animate-pulse rounded bg-white/10" />

        <div className="flex flex-wrap items-start gap-7">
          <div className="min-w-0 flex-[1_1_520px]">
            <div className="mb-2.5 h-5 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-white/5" />
          </div>
        </div>

        <div className="mt-5 h-px bg-divider" />

        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
