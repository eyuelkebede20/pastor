// Registry of vCard field types + pure helpers (href building, vCard export).
// No JSX here so this can be imported from both server routes and the client.
// Icons live in components/FieldIcon.tsx, keyed by the same type strings.

export type FieldKind = "tel" | "email" | "url" | "whatsapp" | "custom";

export type FieldTypeDef = {
  label: string;
  placeholder: string;
  kind: FieldKind;
};

// Order shown in the "add column" picker.
export const FIELD_TYPE_ORDER = [
  "phone",
  "email",
  "website",
  "whatsapp",
  "youtube",
  "instagram",
  "x",
  "linkedin",
  "github",
  "tiktok",
  "facebook",
  "custom",
] as const;

export type FieldType = (typeof FIELD_TYPE_ORDER)[number];

export const FIELD_TYPES: Record<FieldType, FieldTypeDef> = {
  phone: { label: "Phone", placeholder: "+1 555 123 4567", kind: "tel" },
  email: { label: "Email", placeholder: "name@company.com", kind: "email" },
  website: { label: "Website", placeholder: "company.com", kind: "url" },
  whatsapp: { label: "WhatsApp", placeholder: "+1 555 123 4567", kind: "whatsapp" },
  youtube: { label: "YouTube", placeholder: "youtube.com/@handle", kind: "url" },
  instagram: { label: "Instagram", placeholder: "instagram.com/handle", kind: "url" },
  x: { label: "X", placeholder: "x.com/handle", kind: "url" },
  linkedin: { label: "LinkedIn", placeholder: "linkedin.com/in/handle", kind: "url" },
  github: { label: "GitHub", placeholder: "github.com/handle", kind: "url" },
  tiktok: { label: "TikTok", placeholder: "tiktok.com/@handle", kind: "url" },
  facebook: { label: "Facebook", placeholder: "facebook.com/handle", kind: "url" },
  custom: { label: "Custom", placeholder: "Value", kind: "custom" },
};

export function fieldKind(type: string): FieldKind {
  return (FIELD_TYPES[type as FieldType] ?? FIELD_TYPES.custom).kind;
}

export function isKnownType(type: string): type is FieldType {
  return type in FIELD_TYPES;
}

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v);
}

// The tappable link for a field value, or null for plain text.
export function hrefForField(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  switch (fieldKind(type)) {
    case "tel":
      return `tel:${v.replace(/[^\d+]/g, "")}`;
    case "email":
      return `mailto:${v}`;
    case "whatsapp":
      return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
    case "url":
      return normalizeUrl(v);
    case "custom":
      return looksLikeUrl(v) ? normalizeUrl(v) : null;
  }
}

function escapeVcf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

export type VcardInput = {
  fullName: string;
  title?: string | null;
  company?: string | null;
  cardUrl: string;
  fields: { type: string; value: string }[];
};

// Build a minimal but valid vCard 3.0 (.vcf) string.
export function buildVcard(input: VcardInput): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcf(input.fullName)}`];
  if (input.company) lines.push(`ORG:${escapeVcf(input.company)}`);
  if (input.title) lines.push(`TITLE:${escapeVcf(input.title)}`);

  for (const f of input.fields) {
    const value = f.value.trim();
    if (!value) continue;
    const kind = fieldKind(f.type);
    if (kind === "tel" || kind === "whatsapp") {
      lines.push(`TEL;TYPE=CELL:${escapeVcf(value)}`);
    } else if (kind === "email") {
      lines.push(`EMAIL;TYPE=INTERNET:${escapeVcf(value)}`);
    } else {
      const href = hrefForField(f.type, value);
      if (href) lines.push(`URL:${escapeVcf(href)}`);
    }
  }

  lines.push(`URL:${escapeVcf(input.cardUrl)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
