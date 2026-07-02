"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className={`inline-flex items-center gap-1 rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
