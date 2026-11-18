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
import {
  SOCIAL_NETWORKS_CATALOG,
  buildVcard,
} from "@/lib/card-fields";
import { processAvatarFile } from "@/lib/avatar";
import { FieldIcon } from "@/components/FieldIcon";

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
    street: "",
    city: "",
    country: "",
    address: "",
    note: "",
    avatarUrl: "",
    socials: {} as Record<string, string>,
  });

  // vCard preview toggle ("preview" vs "qr")
  const [vcardView, setVcardView] = useState<"preview" | "qr">("preview");

  // Accordions for vCard details (inspired by ass.html)
  const [acc, setAcc] = useState({
    contact: true,
    company: false,
    summary: false,
    address: false,
  });
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
        return vcard.name || vcard.phone || vcard.email || Object.keys(vcard.socials).length > 0
          ? vcardString(vcard)
          : "";
    }
  }, [tab, url, text, wifi, vcard, shortened]);

  async function handleVcardAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Maximum image size is 5MB.");
      return;
    }
    try {
      const dataUrl = await processAvatarFile(file, 256, 0.85);
      setVcard((v) => ({ ...v, avatarUrl: dataUrl }));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to load image file.");
    }
  }

  function downloadVcf() {
    const vcf = buildVcard({
      fullName: vcard.name || "Contact",
      title: vcard.title,
      company: vcard.company,
      avatarUrl: vcard.avatarUrl,
      street: vcard.street,
      city: vcard.city,
      country: vcard.country,
      address: vcard.address,
      note: vcard.note,
      fields: [
        { type: "phone", value: vcard.phone },
        { type: "email", value: vcard.email },
        { type: "website", value: vcard.website },
      ].filter((f) => f.value.trim().length > 0),
      socials: vcard.socials,
    });
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${(vcard.name || "contact").replace(/[^\w.-]+/g, "_")}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

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
            <div className="space-y-4">
              {/* 1. About You / Personal Information (Inspired by ass.html) */}
              <div className="rounded-[10px] border border-border bg-bg/40 p-4 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-accent/15 text-accent font-semibold text-sm">
                    👤
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">About you</h3>
                    <p className="text-xs text-muted">
                      Fill in the information you would like to showcase in your vCard
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="vc-name">Full name *</Label>
                  <input
                    id="vc-name"
                    placeholder="e.g. Jane Cooper"
                    value={vcard.name}
                    onChange={(e) =>
                      setVcard((v) => ({ ...v, name: e.target.value }))
                    }
                    className={`${inputCls} ${!vcard.name.trim() ? "border-amber-500/40" : ""}`}
                  />
                  {!vcard.name.trim() && (
                    <p className="mt-1 text-[11px] text-muted">
                      Full name is required and appears in the card header.
                    </p>
                  )}
                </div>

                {/* Avatar / Profile photo upload */}
                <div>
                  <Label>Profile image</Label>
                  <label
                    htmlFor="vc-avatar"
                    className="mt-1 flex cursor-pointer items-center gap-3.5 rounded-[10px] border border-dashed border-border bg-surface p-3 transition hover:border-accent hover:bg-bg/50"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border bg-bg text-xl font-bold">
                      {vcard.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vcard.avatarUrl}
                          alt="Avatar preview"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-muted text-2xl">🖼</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-ink">
                        {vcard.avatarUrl
                          ? "Change profile image"
                          : "Upload image (jpg, png, svg, webp)"}
                      </span>
                      <span className="block text-[11px] text-muted">
                        Maximum size: 5MB
                      </span>
                    </div>
                    {vcard.avatarUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setVcard((v) => ({ ...v, avatarUrl: "" }));
                        }}
                        className="rounded-[6px] border border-border px-2.5 py-1 text-xs text-muted hover:text-danger hover:border-danger transition"
                      >
                        Remove
                      </button>
                    )}
                  </label>
                  <input
                    id="vc-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleVcardAvatarUpload}
                    className="hidden"
                  />
                  {avatarError && (
                    <p className="mt-1 text-xs text-danger">{avatarError}</p>
                  )}
                </div>

                {/* Collapsible Accordion Sections (Matching ass.html) */}
                <div className="space-y-2 pt-1">
                  {/* Contact details */}
                  <div className="rounded-[8px] border border-border overflow-hidden bg-surface">
                    <button
                      type="button"
                      onClick={() =>
                        setAcc((prev) => ({ ...prev, contact: !prev.contact }))
                      }
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-bg/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-muted">
                          {acc.contact ? "▼" : "▶"}
                        </span>
                        <span>📞 Contact details</span>
                      </span>
                      {(vcard.phone || vcard.email || vcard.website) && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Filled
                        </span>
                      )}
                    </button>
                    {acc.contact && (
                      <div className="space-y-2.5 border-t border-border p-3 bg-bg/20">
                        <div>
                          <Label htmlFor="vc-phone">Phone number</Label>
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
                        <div>
                          <Label htmlFor="vc-email">Email</Label>
                          <input
                            id="vc-email"
                            type="email"
                            placeholder="name@company.com"
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
                            placeholder="https://company.com"
                            value={vcard.website}
                            onChange={(e) =>
                              setVcard((v) => ({
                                ...v,
                                website: e.target.value,
                              }))
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Company details */}
                  <div className="rounded-[8px] border border-border overflow-hidden bg-surface">
                    <button
                      type="button"
                      onClick={() =>
                        setAcc((prev) => ({ ...prev, company: !prev.company }))
                      }
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-bg/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-muted">
                          {acc.company ? "▼" : "▶"}
                        </span>
                        <span>🏢 Company details</span>
                      </span>
                      {(vcard.company || vcard.title) && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Filled
                        </span>
                      )}
                    </button>
                    {acc.company && (
                      <div className="space-y-2.5 border-t border-border p-3 bg-bg/20">
                        <div>
                          <Label htmlFor="vc-company">Company</Label>
                          <input
                            id="vc-company"
                            placeholder="e.g. Acme Corporation"
                            value={vcard.company}
                            onChange={(e) =>
                              setVcard((v) => ({
                                ...v,
                                company: e.target.value,
                              }))
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <Label htmlFor="vc-title">Job title</Label>
                          <input
                            id="vc-title"
                            placeholder="e.g. Chief Executive Officer"
                            value={vcard.title}
                            onChange={(e) =>
                              setVcard((v) => ({ ...v, title: e.target.value }))
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary / Bio */}
                  <div className="rounded-[8px] border border-border overflow-hidden bg-surface">
                    <button
                      type="button"
                      onClick={() =>
                        setAcc((prev) => ({ ...prev, summary: !prev.summary }))
                      }
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-bg/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-muted">
                          {acc.summary ? "▼" : "▶"}
                        </span>
                        <span>📝 Summary / Bio</span>
                      </span>
                      {vcard.note && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Filled
                        </span>
                      )}
                    </button>
                    {acc.summary && (
                      <div className="border-t border-border p-3 bg-bg/20">
                        <Label htmlFor="vc-note">Short summary</Label>
                        <textarea
                          id="vc-note"
                          rows={3}
                          placeholder="Write a short summary about yourself..."
                          value={vcard.note}
                          onChange={(e) =>
                            setVcard((v) => ({ ...v, note: e.target.value }))
                          }
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="rounded-[8px] border border-border overflow-hidden bg-surface">
                    <button
                      type="button"
                      onClick={() =>
                        setAcc((prev) => ({ ...prev, address: !prev.address }))
                      }
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-bg/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-muted">
                          {acc.address ? "▼" : "▶"}
                        </span>
                        <span>📍 Address</span>
                      </span>
                      {(vcard.street || vcard.city || vcard.country) && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                          Filled
                        </span>
                      )}
                    </button>
                    {acc.address && (
                      <div className="space-y-2.5 border-t border-border p-3 bg-bg/20">
                        <div>
                          <Label htmlFor="vc-street">Street</Label>
                          <input
                            id="vc-street"
                            placeholder="e.g. 123 Main Street"
                            value={vcard.street}
                            onChange={(e) =>
                              setVcard((v) => ({
                                ...v,
                                street: e.target.value,
                              }))
                            }
                            className={inputCls}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="vc-city">City</Label>
                            <input
                              id="vc-city"
                              placeholder="e.g. New York"
                              value={vcard.city}
                              onChange={(e) =>
                                setVcard((v) => ({
                                  ...v,
                                  city: e.target.value,
                                }))
                              }
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <Label htmlFor="vc-country">Country</Label>
                            <input
                              id="vc-country"
                              placeholder="e.g. United States"
                              value={vcard.country}
                              onChange={(e) =>
                                setVcard((v) => ({
                                  ...v,
                                  country: e.target.value,
                                }))
                              }
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Social Networks Section (Inspired by ass.html) */}
              <div className="rounded-[10px] border border-border bg-bg/40 p-4 space-y-3.5">
                <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-accent/15 text-accent font-semibold text-sm">
                    🌐
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Social networks</h3>
                    <p className="text-xs text-muted">
                      Click the icons below to add social media channels to your vCard
                    </p>
                  </div>
                </div>

                {/* Grid of official circular brand buttons */}
                <div>
                  <Label>Add social channels</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SOCIAL_NETWORKS_CATALOG.map((net) => {
                      const isActive = net.id in vcard.socials;
                      return (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => {
                            setVcard((prev) => {
                              const copy = { ...prev.socials };
                              if (isActive) {
                                delete copy[net.id];
                              } else {
                                copy[net.id] = "";
                              }
                              return { ...prev, socials: copy };
                            });
                          }}
                          title={net.name}
                          className={`relative flex size-10 items-center justify-center rounded-full border bg-surface transition-all ${
                            isActive
                              ? "border-accent ring-2 ring-accent/40 shadow-sm scale-105"
                              : "border-border/80 hover:border-muted hover:scale-105"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={net.icon}
                            alt={net.name}
                            width={26}
                            height={26}
                            className="size-6.5 rounded-full object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inputs for active social networks */}
                {Object.keys(vcard.socials).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label>Active channels</Label>
                    <div className="space-y-2">
                      {Object.keys(vcard.socials).map((netId) => {
                        const net =
                          SOCIAL_NETWORKS_CATALOG.find((n) => n.id === netId) ?? {
                            id: netId,
                            name: netId,
                            icon: `/icons/social/${netId}.svg`,
                            placeholder: `Enter ${netId} link or username`,
                          };
                        return (
                          <div
                            key={netId}
                            className="flex items-center gap-2 rounded-[8px] border border-border bg-surface p-2"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={net.icon}
                              alt={net.name}
                              width={24}
                              height={24}
                              className="size-6 shrink-0 rounded-full object-contain"
                            />
                            <span className="w-24 shrink-0 text-xs font-medium text-ink truncate">
                              {net.name}
                            </span>
                            <input
                              placeholder={net.placeholder}
                              value={vcard.socials[netId] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVcard((prev) => ({
                                  ...prev,
                                  socials: { ...prev.socials, [netId]: val },
                                }));
                              }}
                              className="w-full bg-transparent text-xs outline-none text-ink placeholder:text-muted"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setVcard((prev) => {
                                  const copy = { ...prev.socials };
                                  delete copy[netId];
                                  return { ...prev, socials: copy };
                                });
                              }}
                              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 text-xs transition"
                              title={`Remove ${net.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

      {/* Right: preview + actions (Inspired by ass.html phone mockup) */}
      <div className="space-y-4 md:sticky md:top-20 md:self-start">
        {tab === "vcard" && (
          <div className="flex border border-accent/40 rounded-full p-1 mx-auto w-fit bg-surface shadow-xs">
            <button
              type="button"
              onClick={() => setVcardView("preview")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                vcardView === "preview"
                  ? "bg-accent text-accent-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              👁 Preview
            </button>
            <button
              type="button"
              onClick={() => setVcardView("qr")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                vcardView === "qr"
                  ? "bg-accent text-accent-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              ⌘ QR code
            </button>
          </div>
        )}

        {/* 1. Mobile Phone Mockup Preview for vCard */}
        {tab === "vcard" && vcardView === "preview" ? (
          <div className="space-y-3">
            <div className="w-[280px] rounded-[38px] border-[8px] border-zinc-950 bg-white overflow-hidden shadow-2xl relative mx-auto select-none">
              {/* Notch & Status Bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-zinc-950 rounded-b-xl z-20" />
              <div className="absolute top-2 left-4 text-[9px] font-semibold text-white/80 z-20">
                18:45
              </div>

              {/* Hero Banner colored with fgColor / bgColor */}
              <div
                className="pt-7 pb-6 px-4 text-center relative transition-colors"
                style={{ backgroundColor: fgColor, color: bgColor }}
              >
                {/* Avatar circle */}
                <div className="size-20 rounded-full border-4 border-white/85 mx-auto mt-2 overflow-hidden shadow-md flex items-center justify-center bg-[#e9d9c8]">
                  {vcard.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vcard.avatarUrl}
                      alt="Avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 80 80"
                      className="size-full"
                    >
                      <rect width="80" height="80" fill="#e8d5c0" />
                      <circle cx="40" cy="32" r="14" fill="#c9a27e" />
                      <path
                        d="M12 80c2-22 14-28 28-28s26 6 28 28z"
                        fill="#fff"
                      />
                    </svg>
                  )}
                </div>

                <div className="mt-2 text-base font-bold truncate">
                  {vcard.name || "Jane Cooper"}
                </div>
                {vcard.title && (
                  <div className="text-xs opacity-90 truncate font-medium">
                    {vcard.title}
                  </div>
                )}
                {vcard.company && (
                  <div className="text-[11px] opacity-80 truncate">
                    {vcard.company}
                  </div>
                )}

                <button
                  type="button"
                  onClick={downloadVcf}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/90 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-black transition active:scale-95"
                >
                  <span>⊕</span>
                  <span>Add contact</span>
                </button>
              </div>

              {/* Card Rows (Styled like ass.html .rows .row) */}
              <div className="p-3 space-y-2 bg-zinc-50/80 -mt-2 rounded-t-2xl relative z-10 border-t border-zinc-200/60 min-h-[170px]">
                {/* Contact row */}
                {(vcard.phone || vcard.email || vcard.website) && (
                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-zinc-150 text-xs text-zinc-800 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Contact
                    </div>
                    {vcard.phone && (
                      <div className="truncate flex items-center gap-1.5 text-zinc-700">
                        <span>📞</span>
                        <span className="font-medium">{vcard.phone}</span>
                      </div>
                    )}
                    {vcard.email && (
                      <div className="truncate flex items-center gap-1.5 text-zinc-700">
                        <span>✉️</span>
                        <span className="font-medium">{vcard.email}</span>
                      </div>
                    )}
                    {vcard.website && (
                      <div className="truncate flex items-center gap-1.5 text-blue-600">
                        <span>🌐</span>
                        <span className="font-medium truncate">
                          {vcard.website}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Company row */}
                {(vcard.company || vcard.title) && (
                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-zinc-150 text-xs text-zinc-800 space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Company
                    </div>
                    <div className="font-semibold text-zinc-900">
                      {vcard.company || "Company"}
                    </div>
                    {vcard.title && (
                      <div className="text-zinc-500">{vcard.title}</div>
                    )}
                  </div>
                )}

                {/* Summary row */}
                {vcard.note && (
                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-zinc-150 text-xs text-zinc-700">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                      Summary
                    </div>
                    <p className="line-clamp-3 text-[11px] leading-relaxed">
                      {vcard.note}
                    </p>
                  </div>
                )}

                {/* Address row */}
                {(vcard.street ||
                  vcard.city ||
                  vcard.country ||
                  vcard.address) && (
                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-zinc-150 text-xs text-zinc-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                      Address
                    </div>
                    <div className="truncate text-zinc-600 font-medium">
                      {[vcard.street, vcard.city, vcard.country]
                        .filter(Boolean)
                        .join(", ") || vcard.address}
                    </div>
                  </div>
                )}

                {/* Social networks row */}
                {Object.entries(vcard.socials).some(
                  ([_, val]) => val && val.trim().length > 0,
                ) && (
                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-zinc-150 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Social channels
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {Object.entries(vcard.socials)
                        .filter(([_, val]) => val && val.trim().length > 0)
                        .map(([net, val]) => (
                          <span
                            key={net}
                            title={`${net}: ${val}`}
                            className="shrink-0 transition transform hover:scale-110"
                          >
                            <FieldIcon type={net} size={28} />
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={downloadVcf}
                className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 shadow transition"
              >
                Download .vcf Contact Card
              </button>
              <button
                type="button"
                onClick={() => setVcardView("qr")}
                className="w-full rounded-[8px] border border-border bg-surface px-4 py-2 text-xs font-medium hover:bg-bg transition"
              >
                Switch to QR code view →
              </button>
            </div>
          </div>
        ) : (
          /* 2. QR Code Canvas & Actions (Standard & when vCard is set to 'qr') */
          <>
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
                  onClick={() =>
                    run("copy", () => canvasRef.current!.copyPng())
                  }
                  className="rounded-[8px] border border-border px-4 py-2.5 text-sm font-medium hover:bg-bg disabled:opacity-40 transition"
                >
                  {busy === "copy" ? "Copying…" : "Copy image"}
                </button>
              </div>
              {tab === "vcard" && (
                <button
                  type="button"
                  onClick={() => setVcardView("preview")}
                  className="w-full rounded-[8px] border border-border bg-surface px-4 py-2 text-xs font-medium hover:bg-bg transition"
                >
                  ← Back to phone preview
                </button>
              )}
              {actionError && (
                <p className="text-sm text-danger">{actionError}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
