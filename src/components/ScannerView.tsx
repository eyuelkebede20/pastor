"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { CopyButton } from "@/components/CopyButton";
import { classifyDecoded } from "@/lib/decode";

type CameraState = "off" | "starting" | "live";

export function ScannerView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [camera, setCamera] = useState<CameraState>("off");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCamera("off");
  }, []);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function startCamera() {
    setError(null);
    setResult(null);
    setCamera("starting");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (res, _err, ctrl) => {
          if (res) {
            ctrl.stop();
            controlsRef.current = null;
            setCamera("off");
            setResult(res.getText());
          }
        },
      );
      controlsRef.current = controls;
      setCamera("live");
    } catch (err) {
      setCamera("off");
      const name = (err as Error)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Camera access was blocked. Allow camera permission in your browser, then try again.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No camera was found on this device. Try uploading an image instead.");
      } else {
        setError("Couldn't start the camera. Try uploading an image instead.");
      }
    }
  }

  async function decodeFile(file: File) {
    setError(null);
    setResult(null);
    stopCamera();
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const res = await reader.decodeFromImageUrl(url);
      setResult(res.getText());
    } catch {
      setError("No QR code was found in that image. Try a clearer photo.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  if (result) {
    return <ResultCard text={result} onReset={reset} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Camera */}
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <h2 className="finder font-display font-bold">Camera</h2>
          <div className="mt-3 aspect-square w-full overflow-hidden rounded-[8px] bg-ink/90">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          </div>
          {camera === "live" ? (
            <button
              type="button"
              onClick={stopCamera}
              className="mt-3 w-full rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg"
            >
              Stop camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={camera === "starting"}
              className="mt-3 w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
            >
              {camera === "starting" ? "Starting…" : "Start camera"}
            </button>
          )}
        </div>

        {/* Upload */}
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <h2 className="finder font-display font-bold">Upload image</h2>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) decodeFile(file);
            }}
            className={`mt-3 flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-4 text-center text-sm text-muted transition-colors ${
              dragging ? "border-accent bg-accent/5" : "border-border"
            }`}
          >
            <span>Drop an image here, or click to choose a file.</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) decodeFile(file);
              }}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-[8px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <p className="text-sm text-muted">
        Scanning happens on your device. Nothing is uploaded.
      </p>
    </div>
  );
}

function ResultCard({ text, onReset }: { text: string; onReset: () => void }) {
  const decoded = classifyDecoded(text);

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-border bg-surface p-5">
        <p className="text-sm font-medium text-muted">Result</p>
        <p className="mt-2 break-words font-mono text-sm">{text}</p>

        {decoded.kind === "wifi" && (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Network</dt>
            <dd className="font-mono">{decoded.ssid || "—"}</dd>
            <dt className="text-muted">Password</dt>
            <dd className="font-mono">{decoded.password || "—"}</dd>
            <dt className="text-muted">Security</dt>
            <dd className="font-mono">{decoded.encryption || "None"}</dd>
          </dl>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <CopyButton value={text} />
          {decoded.kind === "url" && (
            <a
              href={decoded.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded-[8px] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink hover:opacity-90"
            >
              Open link
            </a>
          )}
          <button
            type="button"
            onClick={onReset}
            className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg"
          >
            Scan another
          </button>
        </div>

        {decoded.kind === "url" && (
          <p className="mt-3 text-xs text-muted">
            This link opens: <span className="font-mono">{decoded.url}</span>.
            Only open links you trust.
          </p>
        )}
      </div>
    </div>
  );
}
