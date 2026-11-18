"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { QRCanvas, type QRCanvasHandle } from "@/components/QRCanvas";
import { CopyButton } from "@/components/CopyButton";
import { Label } from "@/components/ui";
import { createShortLink } from "@/actions/shortlinks";
import {
  COLOR_SCHEMES,
  SUGGESTED_LOGOS,
  vcardString,
  wifiString,
  type CornerDotStyle,
  type CornerSquareStyle,
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

  // Content state
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({
    ssid: "",
    password: "",
    encryption: "WPA" as "WPA" | "WEP" | "nopass",
  });
  const [vcard, setVcard] = useState({
    name: "",
    title: "",
    company: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    note: "",
  });

  // Customization state (inspired by ass.html)
  const [fgColor, setFgColor] = useState("#6594FF");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [isTransparentBg, setIsTransparentBg] = useState(false);
  const [dotStyle, setDotStyle] = useState<DotStyle>("square");
  const [cornerSquareStyle, setCornerSquareStyle] =
    useState<CornerSquareStyle>("square");
  const [cornerDotStyle, setCornerDotStyle] = useState<CornerDotStyle>("square");
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
    () => ({
      data: debouncedData,
      fgColor,
      bgColor,
      isTransparentBg,
      dotStyle,
      cornerSquareStyle,
      cornerDotStyle,
      logo,
    }),
    [
      debouncedData,
      fgColor,
      bgColor,
      isTransparentBg,
      dotStyle,
      cornerSquareStyle,
      cornerDotStyle,
      logo,
    ],
  );

  const hasData = debouncedData.trim().length > 0;

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function swapColors() {
    const temp = fgColor;
    setFgColor(bgColor);
    setBgColor(temp);
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
    <div className="grid gap-6 md:grid-cols-[1fr_minmax(280px,320px)]">
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
        <div className="rounded-[12px] border border-border bg-surface p-4">
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
                  placeholder="MyHomeWifi"
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
                  placeholder="Network password"
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="vc-name">Full Name *</Label>
                  <input
                    id="vc-name"
                    placeholder="Jane Doe"
                    value={vcard.name}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, name: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label htmlFor="vc-title">Title / Role</Label>
                  <input
                    id="vc-title"
                    placeholder="Product Designer"
                    value={vcard.title}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, title: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="vc-company">Company</Label>
                  <input
                    id="vc-company"
                    placeholder="Acme Inc."
                    value={vcard.company}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, company: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label htmlFor="vc-phone">Phone</Label>
                  <input
                    id="vc-phone"
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={vcard.phone}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, phone: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="vc-email">Email</Label>
                  <input
                    id="vc-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={vcard.email}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, email: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label htmlFor="vc-web">Website</Label>
                  <input
                    id="vc-web"
                    type="url"
                    placeholder="https://janedoe.com"
                    value={vcard.website}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, website: e.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="vc-addr">Address</Label>
                <input
                  id="vc-addr"
                  placeholder="123 Market St, Suite 400"
                  value={vcard.address}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, address: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <Label htmlFor="vc-note">Bio / Note</Label>
                <textarea
                  id="vc-note"
                  rows={2}
                  placeholder="Brief note or summary"
                  value={vcard.note}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, note: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Customize Panel (Inspired by ass.html) */}
        <div className="space-y-6 rounded-[12px] border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Design and customize
              </h2>
              <p className="text-xs text-muted">
                Choose color scheme, pattern, corners, and logos
              </p>
            </div>
          </div>

          {/* 1. Curated Color Schemes */}
          <div>
            <Label>Color Schemes</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_SCHEMES.map((scheme) => {
                const isSelected =
                  fgColor.toLowerCase() === scheme.fg.toLowerCase() &&
                  bgColor.toLowerCase() === scheme.bg.toLowerCase() &&
                  !isTransparentBg;
                return (
                  <button
                    key={scheme.id}
                    type="button"
                    title={scheme.label}
                    onClick={() => {
                      setFgColor(scheme.fg);
                      setBgColor(scheme.bg);
                      setIsTransparentBg(false);
                    }}
                    className={`flex items-center gap-1.5 rounded-[8px] border p-1.5 transition-all ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/30 bg-accent/5"
                        : "border-border hover:border-muted"
                    }`}
                  >
                    <div
                      className="size-5 rounded-[4px] border border-black/10"
                      style={{ backgroundColor: scheme.fg }}
                    />
                    <div
                      className="size-5 rounded-[4px] border border-black/10"
                      style={{ backgroundColor: scheme.bg }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Color Pickers with Hex inputs & Swap */}
          <div className="space-y-3 rounded-[8px] bg-bg/50 p-3 border border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Primary Color */}
              <div className="flex-1">
                <Label htmlFor="fg-input">Primary color</Label>
                <div className="mt-1 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1 focus-within:border-accent">
                  <input
                    type="color"
                    id="fg-picker"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="size-7 cursor-pointer rounded-[4px] border-none bg-transparent"
                  />
                  <input
                    type="text"
                    id="fg-input"
                    value={fgColor.toUpperCase()}
                    onChange={(e) => setFgColor(e.target.value)}
                    maxLength={7}
                    className="w-full bg-transparent font-mono text-xs font-medium uppercase outline-none"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={swapColors}
                  title="Swap colors"
                  aria-label="Swap colors"
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:border-accent hover:text-ink active:scale-95"
                >
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Secondary Color */}
              <div className="flex-1">
                <Label htmlFor="bg-input">Secondary color</Label>
                <div className="mt-1 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1 focus-within:border-accent">
                  <input
                    type="color"
                    id="bg-picker"
                    disabled={isTransparentBg}
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="size-7 cursor-pointer rounded-[4px] border-none bg-transparent disabled:opacity-30"
                  />
                  <input
                    type="text"
                    id="bg-input"
                    disabled={isTransparentBg}
                    value={isTransparentBg ? "TRANSPARENT" : bgColor.toUpperCase()}
                    onChange={(e) => setBgColor(e.target.value)}
                    maxLength={7}
                    className="w-full bg-transparent font-mono text-xs font-medium uppercase outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isTransparentBg}
                onChange={(e) => setIsTransparentBg(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              Transparent background
            </label>
          </div>

          {/* 3. QR Pattern / Dot Style (6 styles from ass.html) */}
          <div>
            <Label>Pattern style</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[8px] border border-border p-1 text-xs">
              {(
                [
                  { id: "square", label: "Square" },
                  { id: "rounded", label: "Rounded" },
                  { id: "dots", label: "Dots" },
                  { id: "classy", label: "Classy" },
                  { id: "classy-rounded", label: "Classy Round" },
                  { id: "extra-rounded", label: "Extra Round" },
                ] as { id: DotStyle; label: string }[]
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={dotStyle === d.id}
                  onClick={() => setDotStyle(d.id)}
                  className={`rounded-[6px] px-2 py-1.5 text-xs font-medium transition-colors ${
                    dotStyle === d.id
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Corners Frame & Dot Style */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Corner frame</Label>
              <div className="mt-1 flex gap-1 rounded-[8px] border border-border p-1 text-xs">
                {(
                  [
                    { id: "square", label: "Square" },
                    { id: "dot", label: "Rounded" },
                    { id: "extra-rounded", label: "Extra" },
                  ] as { id: CornerSquareStyle; label: string }[]
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCornerSquareStyle(c.id)}
                    className={`flex-1 rounded-[6px] px-2 py-1 text-xs font-medium transition-colors ${
                      cornerSquareStyle === c.id
                        ? "bg-accent text-accent-ink"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Corner dot</Label>
              <div className="mt-1 flex gap-1 rounded-[8px] border border-border p-1 text-xs">
                {(
                  [
                    { id: "square", label: "Square" },
                    { id: "dot", label: "Round" },
                  ] as { id: CornerDotStyle; label: string }[]
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCornerDotStyle(c.id)}
                    className={`flex-1 rounded-[6px] px-2 py-1 text-xs font-medium transition-colors ${
                      cornerDotStyle === c.id
                        ? "bg-accent text-accent-ink"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Center Logo (Suggested presets & upload) */}
          <div>
            <Label htmlFor="logo">Add logo</Label>
            <p className="mb-2 text-xs text-muted">
              Select a popular icon or upload your own image.
            </p>

            <div className="flex flex-wrap gap-1.5 pb-3">
              {SUGGESTED_LOGOS.map((item) => {
                const isSelected = logo === item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLogo(isSelected ? undefined : item.icon)}
                    title={item.label}
                    className={`flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border text-muted hover:border-muted hover:text-ink"
                    }`}
                  >
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={14}
                      height={14}
                      className="size-3.5 object-contain"
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="block w-full text-xs text-muted file:mr-3 file:rounded-[8px] file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo(undefined)}
                  className="shrink-0 rounded-[8px] border border-border px-2.5 py-1.5 text-xs text-muted hover:text-danger hover:border-danger"
                >
                  Remove logo
                </button>
              )}
            </div>
            {logo && (
              <p className="mt-2 text-xs text-muted">
                Logo active. High error correction is applied automatically for
                reliable scans.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: preview + actions */}
      <div className="space-y-4 md:sticky md:top-20 md:self-start">
        <div className="rounded-[12px] border border-border bg-surface p-4 flex flex-col items-center">
          <QRCanvas ref={canvasRef} config={config} size={280} />
          {hasData && (
            <p className="mt-2 text-center text-xs text-muted">
              Live scannable preview
            </p>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={!hasData || busy !== null}
            onClick={() =>
              run("png", () => canvasRef.current!.downloadPng("qr-code"))
            }
            className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40 transition"
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
              className="rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg disabled:opacity-40 transition"
            >
              Download SVG
            </button>
            <button
              type="button"
              disabled={!hasData || busy !== null}
              onClick={() => run("copy", () => canvasRef.current!.copyPng())}
              className="rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg disabled:opacity-40 transition"
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
