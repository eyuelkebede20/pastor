"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCanvas, type QRCanvasHandle } from "@/components/QRCanvas";
import { CopyButton } from "@/components/CopyButton";
import { Label } from "@/components/ui";
import { createShortLink } from "@/actions/shortlinks";
import {
  vcardString,
  wifiString,
  type DotStyle,
  type QrConfig,
} from "@/lib/qr";

type Tab = "url" | "text" | "wifi" | "vcard";

const TABS: { id: Tab; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "vcard", label: "vCard" },
];

const inputCls =
  "w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function QRGenerator() {
  const [tab, setTab] = useState<Tab>("url");

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({
    ssid: "",
    password: "",
    encryption: "WPA" as "WPA" | "WEP" | "nopass",
  });
  const [vcard, setVcard] = useState({ name: "", phone: "", email: "" });

  const [fgColor, setFgColor] = useState("#111111");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [dotStyle, setDotStyle] = useState<DotStyle>("square");
  const [logo, setLogo] = useState<string | undefined>(undefined);

  const canvasRef = useRef<QRCanvasHandle>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Shorten & get QR (anonymous-friendly).
  const [shortened, setShortened] = useState<{ shortUrl: string } | null>(null);
  const [shortenBusy, setShortenBusy] = useState(false);
  const [shortenError, setShortenError] = useState<string | null>(null);

  // Raw content string for the active tab.
  const rawData = useMemo(() => {
    switch (tab) {
      case "url":
        return shortened ? shortened.shortUrl : url.trim();
      case "text":
        return text;
      case "wifi":
        return wifi.ssid ? wifiString(wifi) : "";
      case "vcard":
        return vcard.name || vcard.phone || vcard.email
          ? vcardString(vcard)
          : "";
    }
  }, [tab, url, text, wifi, vcard, shortened]);

  async function shorten() {
    setShortenError(null);
    setShortenBusy(true);
    try {
      const res = await createShortLink({ url: url.trim() });
      if (res.ok) {
        setShortened({ shortUrl: res.shortUrl });
      } else {
        setShortenError(res.error);
      }
    } catch {
      setShortenError("Couldn't shorten that link. Please try again.");
    } finally {
      setShortenBusy(false);
    }
  }

  // Debounce the content feeding the preview (150ms).
  const [debouncedData, setDebouncedData] = useState(rawData);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedData(rawData), 150);
    return () => clearTimeout(t);
  }, [rawData]);

  const config: QrConfig = useMemo(
    () => ({ data: debouncedData, fgColor, bgColor, dotStyle, logo }),
    [debouncedData, fgColor, bgColor, dotStyle, logo],
  );

  const hasData = debouncedData.trim().length > 0;

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function run(action: string, fn: () => Promise<void>) {
    setActionError(null);
    setBusy(action);
    try {
      await fn();
    } catch {
      setActionError(
        action === "copy"
          ? "Couldn't copy the image. Try downloading instead."
          : "Something went wrong generating the file.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_minmax(240px,300px)]">
      {/* Left: content + customize */}
      <div className="space-y-6">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="QR content type"
          className="flex gap-1 rounded-[8px] border border-border bg-surface p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-accent text-accent-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content inputs */}
        <div>
          {tab === "url" && (
            <div>
              <Label htmlFor="qr-url">Link</Label>
              <input
                id="qr-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setShortened(null);
                  setShortenError(null);
                }}
                className={inputCls}
              />

              {shortened ? (
                <div className="mt-3 rounded-[8px] border border-border bg-bg p-3">
                  <p className="text-xs text-muted">Short link</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">
                      {shortened.shortUrl}
                    </span>
                    <CopyButton value={shortened.shortUrl} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShortened(null)}
                    className="mt-2 text-xs font-medium text-muted hover:text-ink"
                  >
                    Use the original link instead
                  </button>
                </div>
              ) : (
                url.trim().length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={shorten}
                      disabled={shortenBusy}
                      className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {shortenBusy ? "Shortening…" : "Shorten & get QR"}
                    </button>
                    {shortenError && (
                      <p className="mt-1 text-sm text-danger">{shortenError}</p>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {tab === "text" && (
            <div>
              <Label htmlFor="qr-text">Text</Label>
              <textarea
                id="qr-text"
                rows={4}
                placeholder="Anything you like"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {tab === "wifi" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="wifi-ssid">Network name (SSID)</Label>
                <input
                  id="wifi-ssid"
                  value={wifi.ssid}
                  onChange={(e) =>
                    setWifi((w) => ({ ...w, ssid: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label htmlFor="wifi-pass">Password</Label>
                <input
                  id="wifi-pass"
                  value={wifi.password}
                  disabled={wifi.encryption === "nopass"}
                  onChange={(e) =>
                    setWifi((w) => ({ ...w, password: e.target.value }))
                  }
                  className={`${inputCls} disabled:opacity-50`}
                />
              </div>
              <div>
                <Label htmlFor="wifi-enc">Encryption</Label>
                <select
                  id="wifi-enc"
                  value={wifi.encryption}
                  onChange={(e) =>
                    setWifi((w) => ({
                      ...w,
                      encryption: e.target.value as typeof w.encryption,
                    }))
                  }
                  className={inputCls}
                >
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None</option>
                </select>
              </div>
            </div>
          )}

          {tab === "vcard" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="vc-name">Name</Label>
                <input
                  id="vc-name"
                  value={vcard.name}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, name: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label htmlFor="vc-phone">Phone</Label>
                <input
                  id="vc-phone"
                  type="tel"
                  value={vcard.phone}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, phone: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <Label htmlFor="vc-email">Email</Label>
                <input
                  id="vc-email"
                  type="email"
                  value={vcard.email}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, email: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Customize row */}
        <div className="space-y-4 rounded-[12px] border border-border bg-surface p-4">
          <p className="text-sm font-medium">Customize</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fg">Foreground</Label>
              <input
                id="fg"
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-[8px] border border-border bg-surface"
              />
            </div>
            <div>
              <Label htmlFor="bg">Background</Label>
              <input
                id="bg"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-[8px] border border-border bg-surface"
              />
            </div>
          </div>

          <div>
            <Label>Dot style</Label>
            <div className="flex gap-1 rounded-[8px] border border-border p-1">
              {(["square", "rounded", "dots"] as DotStyle[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dotStyle === d}
                  onClick={() => setDotStyle(d)}
                  className={`flex-1 rounded-[6px] px-2 py-1.5 text-sm capitalize transition-colors ${
                    dotStyle === d
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="logo">Center logo (optional)</Label>
            <div className="flex items-center gap-2">
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-[8px] file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo(undefined)}
                  className="rounded-[8px] border border-border px-2 py-1.5 text-sm text-muted hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>
            {logo && (
              <p className="mt-2 text-xs text-muted">
                A logo can make the code harder to scan. Error correction is set
                to high to help.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: preview + actions */}
      <div className="space-y-4 md:sticky md:top-20 md:self-start">
        <QRCanvas ref={canvasRef} config={config} size={280} />

        <div className="space-y-2">
          <button
            type="button"
            disabled={!hasData || busy !== null}
            onClick={() =>
              run("png", () => canvasRef.current!.downloadPng("qr-code"))
            }
            className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
          >
            {busy === "png" ? "Preparing…" : "Download PNG"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasData || busy !== null}
              onClick={() =>
                run("svg", () => canvasRef.current!.downloadSvg("qr-code"))
              }
              className="rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg disabled:opacity-40"
            >
              Download SVG
            </button>
            <button
              type="button"
              disabled={!hasData || busy !== null}
              onClick={() => run("copy", () => canvasRef.current!.copyPng())}
              className="rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg disabled:opacity-40"
            >
              {busy === "copy" ? "Copying…" : "Copy image"}
            </button>
          </div>
          {actionError && (
            <p className="text-sm text-danger">{actionError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
