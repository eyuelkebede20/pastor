"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { buildQrOptions, type QrConfig } from "@/lib/qr";

export type QRCanvasHandle = {
  downloadPng: (name: string) => Promise<void>;
  downloadSvg: (name: string) => Promise<void>;
  copyPng: () => Promise<void>;
};

// qr-code-styling is loaded lazily because it touches the DOM at import time.
// We keep a live preview instance and spin up a high-res instance for exports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QRCodeStyling = any;

async function loadLib() {
  const mod = await import("qr-code-styling");
  return mod.default as new (options: unknown) => QRCodeStyling;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const QRCanvas = forwardRef<
  QRCanvasHandle,
  { config: QrConfig; size?: number; className?: string }
>(function QRCanvas({ config, size = 256, className = "" }, ref) {
  const holderRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<QRCodeStyling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasData = config.data.trim().length > 0;

  // Create / update the preview instance.
  useEffect(() => {
    let cancelled = false;
    if (!hasData) return;
    (async () => {
      try {
        const QR = await loadLib();
        if (cancelled) return;
        const options = buildQrOptions(config, size);
        if (!instanceRef.current) {
          instanceRef.current = new QR(options);
          if (holderRef.current) {
            holderRef.current.innerHTML = "";
            instanceRef.current.append(holderRef.current);
          }
        } else {
          instanceRef.current.update(options);
        }
        setError(null);
      } catch {
        setError("Could not render this QR code.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, size, hasData]);

  async function buildRaw(extension: "png" | "svg", exportSize: number) {
    const QR = await loadLib();
    const instance = new QR(buildQrOptions(config, exportSize));
    const raw = await instance.getRawData(extension);
    if (!raw) throw new Error("no data");
    return raw instanceof Blob
      ? raw
      : new Blob([raw as BlobPart], {
          type: extension === "svg" ? "image/svg+xml" : "image/png",
        });
  }

  useImperativeHandle(
    ref,
    () => ({
      async downloadPng(name: string) {
        const blob = await buildRaw("png", 1024);
        triggerDownload(blob, `${name}.png`);
      },
      async downloadSvg(name: string) {
        const blob = await buildRaw("svg", 1024);
        triggerDownload(blob, `${name}.svg`);
      },
      async copyPng() {
        const blob = await buildRaw("png", 1024);
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      },
    }),
    // buildRaw closes over config; recreate handle when config/size change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, size],
  );

  return (
    <div
      className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-[12px] border border-border bg-surface ${className}`}
      style={{ maxWidth: size }}
    >
      {hasData ? (
        <div ref={holderRef} aria-label="QR code preview" role="img" />
      ) : (
        <p className="px-6 text-center text-sm text-muted">
          Your QR code appears here.
        </p>
      )}
      {error && <p className="px-6 text-center text-sm text-danger">{error}</p>}
    </div>
  );
});
