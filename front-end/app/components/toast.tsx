"use client";

import { useEffect } from "react";
import { WarningIcon } from "@/app/components/icons";

type ToastProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function Toast({ message, onDismiss, durationMs = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-warn-400 bg-surface px-3.5 py-2.5 text-[13px] text-warn-300 shadow-lg">
      <WarningIcon className="h-4 w-4 flex-none" />
      <span>{message}</span>
    </div>
  );
}
