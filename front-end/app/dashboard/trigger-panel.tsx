"use client";

import { useState } from "react";
import { PaperPlaneIcon, SpinnerIcon, WarningIcon } from "@/app/components/icons";
import { ApiError, triggerReview } from "@/app/lib/api";

type TriggerPanelProps = {
  onTriggered?: (eventId: string) => void;
};

export function TriggerPanel({ onTriggered }: TriggerPanelProps) {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentEventId, setSentEventId] = useState<string | null>(null);

  const pullNumber = Number(prNumber);
  const isValid = owner.trim() !== "" && repo.trim() !== "" && Number.isInteger(pullNumber) && pullNumber > 0;

  async function handleSend() {
    if (!isValid || sending) return;

    setSending(true);
    setError(null);
    setSentEventId(null);
    try {
      const result = await triggerReview({ owner: owner.trim(), repo: repo.trim(), pullNumber });
      setSentEventId(result.eventId);
      onTriggered?.(result.eventId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send event");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-[22px] flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] uppercase tracking-wide text-fg/45">Manual trigger</span>
        <span className="ml-auto font-mono text-[11px] text-fg/40">
          inngest.send · github/pull_request.review
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <Field
          label="Owner"
          value={owner}
          onChange={setOwner}
          placeholder="e.g. acme"
          className="flex-[1_1_150px]"
        />
        <Field
          label="Repository"
          value={repo}
          onChange={setRepo}
          placeholder="e.g. checkout-api"
          className="flex-[1_1_180px]"
        />
        <Field
          label="PR number"
          value={prNumber}
          onChange={setPrNumber}
          placeholder="e.g. 418"
          className="flex-[0_1_110px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!isValid || sending}
          className="flex h-9 items-center gap-1.5 rounded-md bg-accent-500 px-3.5 text-[13px] font-medium text-accent-900 transition-colors hover:bg-accent-400 disabled:opacity-50"
        >
          {sending ? (
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PaperPlaneIcon className="h-3.5 w-3.5" />
          )}
          {sending ? "Sending…" : "Send event"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-[12.5px] text-warn-300">
          <WarningIcon className="h-3.5 w-3.5 flex-none" />
          <span>{error}</span>
        </div>
      )}
      {!error && sentEventId && (
        <div className="font-mono text-[12px] text-fg/50">
          Event sent · {sentEventId}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
      />
    </label>
  );
}
