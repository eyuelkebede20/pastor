"use client";

import { useEffect, useRef } from "react";
import { QRCanvas, type QRCanvasHandle } from "@/components/QRCanvas";
import { CopyButton } from "@/components/CopyButton";

// The single allowed modal in the product (used for the profile QR preview).
export function QRModal({
  data,
  title,
  downloadName = "qr-code",
  onClose,
}: {
  data: string;
  title: string;
  downloadName?: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<QRCanvasHandle>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-[12px] border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[8px] px-2 py-1 text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mx-auto max-w-[240px]">
          <QRCanvas
            ref={canvasRef}
            config={{
              data,
              fgColor: "#111111",
              bgColor: "#FFFFFF",
              dotStyle: "square",
            }}
            size={240}
          />
        </div>

        <p className="mt-3 truncate text-center font-mono text-xs text-muted">
          {data}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => canvasRef.current?.downloadPng(downloadName)}
            className="flex-1 rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            Download PNG
          </button>
          <CopyButton value={data} label="Copy link" />
        </div>
      </div>
    </div>
  );
}
