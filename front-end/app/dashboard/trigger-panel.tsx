"use client";

import { useState } from "react";
import { PaperPlaneIcon } from "@/app/components/icons";

export function TriggerPanel() {
  const [owner, setOwner] = useState("acme");
  const [repo, setRepo] = useState("checkout-api");
  const [prNumber, setPrNumber] = useState("418");

  return (
    <div className="mb-[22px] flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] uppercase tracking-wide text-fg/45">Manual trigger</span>
        <span className="ml-auto font-mono text-[11px] text-fg/40">
          inngest.send · github/pull_request.review
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <Field label="Owner" value={owner} onChange={setOwner} className="flex-[1_1_150px]" />
        <Field
          label="Repository"
          value={repo}
          onChange={setRepo}
          className="flex-[1_1_180px]"
        />
        <Field
          label="PR number"
          value={prNumber}
          onChange={setPrNumber}
          className="flex-[0_1_110px]"
        />
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent-500 px-3.5 text-[13px] font-medium text-accent-900 transition-colors hover:bg-accent-400"
        >
          <PaperPlaneIcon className="h-3.5 w-3.5" />
          Send event
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[11px] text-fg/50">{label}</span>
      <input
        className="h-9 rounded-md border border-divider bg-bg px-2.5 text-[13px] text-fg outline-none focus:border-accent-500"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
