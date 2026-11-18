// Shared QR helpers used by the generator and the link dashboard.
// Kept framework-agnostic so both the client canvas and any server code can
// serialize the same content strings.

export type DotStyle =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";

export type CornerSquareStyle = "square" | "dot" | "extra-rounded";
export type CornerDotStyle = "square" | "dot";

export type QrConfig = {
  data: string;
  fgColor: string;
  bgColor: string;
  dotStyle: DotStyle;
  cornerSquareStyle?: CornerSquareStyle;
  cornerDotStyle?: CornerDotStyle;
  cornerColor?: string;
  cornerDotColor?: string;
  isTransparentBg?: boolean;
  logo?: string; // client-side dataURL only
};

// Preset Color Schemes inspired by ass.html
export const COLOR_SCHEMES = [
  { id: "scheme-1", label: "Classic Blue", fg: "#6594FF", bg: "#FFFFFF" },
  { id: "scheme-2", label: "Dark / Slate", fg: "#232321", bg: "#ECEDF1" },
  { id: "scheme-3", label: "Blue / Light", fg: "#6594FF", bg: "#ECECF0" },
  { id: "scheme-4", label: "Sky Blue", fg: "#6594FF", bg: "#DAEBF6" },
  { id: "scheme-5", label: "Purple / White", fg: "#B69EDE", bg: "#FFFFFF" },
  { id: "scheme-6", label: "Forest / Mint", fg: "#242420", bg: "#6ECD9D" },
  { id: "scheme-7", label: "Amber / White", fg: "#FACB67", bg: "#FFFFFF" },
  { id: "scheme-8", label: "Monochrome", fg: "#111111", bg: "#FFFFFF" },
] as const;

// Suggested center logo presets
export const SUGGESTED_LOGOS = [
  { id: "web", label: "Website", icon: "/icons/social/web.svg" },
  { id: "whatsapp", label: "WhatsApp", icon: "/icons/social/whatsapp.svg" },
  { id: "instagram", label: "Instagram", icon: "/icons/social/instagram.svg" },
  { id: "linkedin", label: "LinkedIn", icon: "/icons/social/linkedin.svg" },
  { id: "youtube", label: "YouTube", icon: "/icons/social/youtube.svg" },
  { id: "x", label: "X (Twitter)", icon: "/icons/social/x.svg" },
  { id: "github", label: "GitHub", icon: "/icons/social/github.svg" },
  { id: "facebook", label: "Facebook", icon: "/icons/social/facebook.svg" },
  { id: "tiktok", label: "TikTok", icon: "/icons/social/tiktok.svg" },
  { id: "telegram", label: "Telegram", icon: "/icons/social/telegram.svg" },
] as const;

// qr-code-styling options. Typed loosely because the library is loaded
// dynamically (it touches the DOM at import time).
export function buildQrOptions(cfg: QrConfig, size: number) {
  const bg = cfg.isTransparentBg ? "transparent" : cfg.bgColor;
  const cornerSquare =
    cfg.cornerSquareStyle ||
    (cfg.dotStyle === "dots"
      ? "dot"
      : cfg.dotStyle === "rounded"
        ? "dot"
        : cfg.dotStyle === "extra-rounded"
          ? "extra-rounded"
          : "square");
  const cornerDot =
    cfg.cornerDotStyle || (cfg.dotStyle === "dots" ? "dot" : "square");

  return {
    width: size,
    height: size,
    type: "canvas" as const,
    data: cfg.data,
    margin: Math.round(size * 0.03),
    image: cfg.logo || undefined,
    qrOptions: {
      errorCorrectionLevel: cfg.logo ? "H" : "M",
    },
    dotsOptions: { color: cfg.fgColor, type: cfg.dotStyle },
    backgroundOptions: { color: bg },
    cornersSquareOptions: {
      color: cfg.cornerColor || cfg.fgColor,
      type: cornerSquare,
    },
    cornersDotOptions: {
      color: cfg.cornerDotColor || cfg.fgColor,
      type: cornerDot,
    },
    imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.35 },
  };
}

function escapeWifi(value: string) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function wifiString(input: {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
}) {
  const ssid = escapeWifi(input.ssid);
  if (input.encryption === "nopass") {
    return `WIFI:T:nopass;S:${ssid};;`;
  }
  return `WIFI:T:${input.encryption};S:${ssid};P:${escapeWifi(
    input.password,
  )};;`;
}

export function vcardString(input: {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
  address?: string;
  note?: string;
}) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    input.name && `FN:${input.name}`,
    input.company && `ORG:${input.company}`,
    input.title && `TITLE:${input.title}`,
    input.phone && `TEL;TYPE=CELL:${input.phone}`,
    input.email && `EMAIL:${input.email}`,
    input.website && `URL:${input.website}`,
    input.address && `ADR;TYPE=WORK:;;${input.address};;;;`,
    input.note && `NOTE:${input.note}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}
