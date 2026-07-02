// Shared QR helpers used by the generator and the link dashboard.
// Kept framework-agnostic so both the client canvas and any server code can
// serialize the same content strings.

export type DotStyle = "square" | "rounded" | "dots";

export type QrConfig = {
  data: string;
  fgColor: string;
  bgColor: string;
  dotStyle: DotStyle;
  logo?: string; // client-side dataURL only
};

// qr-code-styling options. Typed loosely because the library is loaded
// dynamically (it touches the DOM at import time).
export function buildQrOptions(cfg: QrConfig, size: number) {
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
    backgroundOptions: { color: cfg.bgColor },
    cornersSquareOptions: {
      color: cfg.fgColor,
      type: cfg.dotStyle === "dots" ? "dot" : "square",
    },
    cornersDotOptions: { color: cfg.fgColor },
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
  phone: string;
  email: string;
}) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    input.name && `FN:${input.name}`,
    input.phone && `TEL;TYPE=CELL:${input.phone}`,
    input.email && `EMAIL:${input.email}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}
