// Helpers for interpreting decoded QR text. Pure functions, no DOM.

export type Decoded =
  | { kind: "url"; url: string }
  | { kind: "wifi"; ssid?: string; password?: string; encryption?: string }
  | { kind: "text" };

export function classifyDecoded(text: string): Decoded {
  const trimmed = text.trim();

  if (/^WIFI:/i.test(trimmed)) {
    const body = trimmed.slice(5);
    const field = (key: string) => {
      const m = body.match(new RegExp(`(?:^|;)${key}:((?:\\\\.|[^;])*)`, "i"));
      return m ? m[1].replace(/\\(.)/g, "$1") : undefined;
    };
    return {
      kind: "wifi",
      ssid: field("S"),
      password: field("P"),
      encryption: field("T"),
    };
  }

  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return { kind: "url", url: u.toString() };
    }
  } catch {
    /* not a URL */
  }

  return { kind: "text" };
}
