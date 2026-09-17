"use client";

import { useEffect } from "react";
import { NavBar } from "@/app/components/nav-bar";
import { WarningIcon } from "@/app/components/icons";

export default function ReviewDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="runs" />
      <div className="mx-auto max-w-[1240px] px-8 pb-16">
        <div className="mt-16 flex flex-col items-center gap-3 rounded-lg border border-divider bg-surface px-6 py-10 text-center">
          <WarningIcon className="h-6 w-6 text-warn-400" />
          <span className="text-[15px] font-medium">Couldn&apos;t load this review</span>
          <p className="max-w-[48ch] text-[13px] text-fg/55">
            {error.message || "Something went wrong talking to the backend."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 flex h-9 items-center gap-1.5 rounded-md bg-accent-500 px-3.5 text-[13px] font-medium text-accent-900 transition-colors hover:bg-accent-400"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
