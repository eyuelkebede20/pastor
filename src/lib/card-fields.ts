// Registry of vCard field types + pure helpers (href building, vCard export).
// No JSX here so this can be imported from both server routes and the client.
// Icons live in components/FieldIcon.tsx, keyed by the same type strings.

export type FieldKind = "tel" | "email" | "url" | "whatsapp" | "custom";

export type FieldTypeDef = {
  label: string;
  placeholder: string;
  kind: FieldKind;
};

// Preset Color Schemes from ass.html
export const VCARD_COLOR_PRESETS = [
  { fg: "#6594FF", bg: "#FFFFFF", label: "Classic Blue" },
  { fg: "#EEEEF0", bg: "#222222", label: "Dark / Slate" },
  { fg: "#EEEEF0", bg: "#6594FF", label: "Soft / Blue" },
  { fg: "#D8E8F6", bg: "#6594FF", label: "Ice / Sky" },
  { fg: "#B79DDB", bg: "#FFFFFF", label: "Lavender" },
  { fg: "#6FCF97", bg: "#222222", label: "Mint / Dark" },
  { fg: "#FBC85E", bg: "#FFFFFF", label: "Amber / White" },
] as const;

// Social networks catalog matching official icons in public/icons/social/
export type SocialNetworkDef = {
  id: string;
  name: string;
  icon: string;
  color: string;
  placeholder: string;
  prefix?: string;
};

export const SOCIAL_NETWORKS_CATALOG: SocialNetworkDef[] = [
  { id: "facebook", name: "Facebook", icon: "/icons/social/facebook.svg", color: "#1877F2", placeholder: "facebook.com/username", prefix: "https://facebook.com/" },
  { id: "instagram", name: "Instagram", icon: "/icons/social/instagram.svg", color: "#E1306C", placeholder: "instagram.com/username", prefix: "https://instagram.com/" },
  { id: "whatsapp", name: "WhatsApp", icon: "/icons/social/whatsapp.svg", color: "#25D366", placeholder: "+1 555 123 4567", prefix: "https://wa.me/" },
  { id: "x", name: "X (Twitter)", icon: "/icons/social/x.svg", color: "#000000", placeholder: "x.com/username", prefix: "https://x.com/" },
  { id: "youtube", name: "YouTube", icon: "/icons/social/youtube.svg", color: "#FF0000", placeholder: "youtube.com/@channel", prefix: "https://youtube.com/" },
  { id: "linkedin", name: "LinkedIn", icon: "/icons/social/linkedin.svg", color: "#0A66C2", placeholder: "linkedin.com/in/username", prefix: "https://linkedin.com/in/" },
  { id: "tiktok", name: "TikTok", icon: "/icons/social/tiktok.svg", color: "#000000", placeholder: "tiktok.com/@username", prefix: "https://tiktok.com/@" },
  { id: "telegram", name: "Telegram", icon: "/icons/social/telegram.svg", color: "#27A7E7", placeholder: "t.me/username", prefix: "https://t.me/" },
  { id: "snapchat", name: "Snapchat", icon: "/icons/social/snapchat.svg", color: "#FFFC00", placeholder: "snapchat.com/add/username", prefix: "https://snapchat.com/add/" },
  { id: "github", name: "GitHub", icon: "/icons/social/github.svg", color: "#24292F", placeholder: "github.com/username", prefix: "https://github.com/" },
  { id: "pinterest", name: "Pinterest", icon: "/icons/social/pinterest.svg", color: "#E60023", placeholder: "pinterest.com/username", prefix: "https://pinterest.com/" },
  { id: "reddit", name: "Reddit", icon: "/icons/social/reddit.svg", color: "#FF4500", placeholder: "reddit.com/u/username", prefix: "https://reddit.com/u/" },
  { id: "dribbble", name: "Dribbble", icon: "/icons/social/dribbble.svg", color: "#EA4C89", placeholder: "dribbble.com/username", prefix: "https://dribbble.com/" },
  { id: "signal", name: "Signal", icon: "/icons/social/signal.svg", color: "#3A76F0", placeholder: "signal.me/#p/...", prefix: "https://signal.me/#p/" },
  { id: "messenger", name: "Messenger", icon: "/icons/social/messenger.svg", color: "#0084FF", placeholder: "m.me/username", prefix: "https://m.me/" },
  { id: "tripadvisor", name: "TripAdvisor", icon: "/icons/social/tripadvisor.svg", color: "#34E0A1", placeholder: "tripadvisor.com/...", prefix: "https://tripadvisor.com/" },
  { id: "yelp", name: "Yelp", icon: "/icons/social/yelp.svg", color: "#D32323", placeholder: "yelp.com/biz/...", prefix: "https://yelp.com/biz/" },
  { id: "googlereviews", name: "Google Reviews", icon: "/icons/social/google-reviews.svg", color: "#4285F4", placeholder: "g.page/r/...", prefix: "https://g.page/r/" },
  { id: "tumblr", name: "Tumblr", icon: "/icons/social/tumblr.svg", color: "#35465C", placeholder: "username.tumblr.com", prefix: "https://" },
  { id: "viber", name: "Viber", icon: "/icons/social/viber.svg", color: "#7360F2", placeholder: "+1 555 123 4567", prefix: "tel:" },
  { id: "line", name: "LINE", icon: "/icons/social/line.svg", color: "#06C755", placeholder: "line.me/ti/p/...", prefix: "https://line.me/ti/p/" },
  { id: "doordash", name: "DoorDash", icon: "/icons/social/doordash.svg", color: "#EB1700", placeholder: "doordash.com/store/...", prefix: "https://doordash.com/store/" },
  { id: "xing", name: "XING", icon: "/icons/social/xing.svg", color: "#00605E", placeholder: "xing.com/profile/...", prefix: "https://xing.com/profile/" },
  { id: "vk", name: "VK", icon: "/icons/social/vk.svg", color: "#0077FF", placeholder: "vk.com/username", prefix: "https://vk.com/" },
  { id: "apple", name: "Apple Music", icon: "/icons/social/apple.svg", color: "#000000", placeholder: "music.apple.com/...", prefix: "https://music.apple.com/" },
  { id: "netflix", name: "Netflix", icon: "/icons/social/netflix.svg", color: "#E50914", placeholder: "netflix.com/title/...", prefix: "https://netflix.com/" },
  { id: "outlook", name: "Outlook", icon: "/icons/social/outlook.svg", color: "#0078D4", placeholder: "name@outlook.com", prefix: "mailto:" },
  { id: "gmail", name: "Gmail", icon: "/icons/social/gmail.svg", color: "#EA4335", placeholder: "name@gmail.com", prefix: "mailto:" },
  { id: "website", name: "Website", icon: "/icons/social/web.svg", color: "#5B8DEF", placeholder: "https://example.com", prefix: "https://" },
];

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
  "telegram",
  "snapchat",
  "pinterest",
  "reddit",
  "dribbble",
  "signal",
  "messenger",
  "tripadvisor",
  "yelp",
  "googlereviews",
  "tumblr",
  "viber",
  "line",
  "doordash",
  "xing",
  "vk",
  "apple",
  "netflix",
  "outlook",
  "gmail",
  "custom",
] as const;

export type FieldType = (typeof FIELD_TYPE_ORDER)[number];

export const FIELD_TYPES: Record<FieldType, FieldTypeDef> = {
  phone: { label: "Phone", placeholder: "+1 555 123 4567", kind: "tel" },
  email: { label: "Email", placeholder: "name@company.com", kind: "email" },
  website: { label: "Website", placeholder: "https://company.com", kind: "url" },
  whatsapp: { label: "WhatsApp", placeholder: "+1 555 123 4567", kind: "whatsapp" },
  youtube: { label: "YouTube", placeholder: "youtube.com/@handle", kind: "url" },
  instagram: { label: "Instagram", placeholder: "instagram.com/handle", kind: "url" },
  x: { label: "X", placeholder: "x.com/handle", kind: "url" },
  linkedin: { label: "LinkedIn", placeholder: "linkedin.com/in/handle", kind: "url" },
  github: { label: "GitHub", placeholder: "github.com/handle", kind: "url" },
  tiktok: { label: "TikTok", placeholder: "tiktok.com/@handle", kind: "url" },
  facebook: { label: "Facebook", placeholder: "facebook.com/handle", kind: "url" },
  telegram: { label: "Telegram", placeholder: "t.me/username", kind: "url" },
  snapchat: { label: "Snapchat", placeholder: "snapchat.com/add/username", kind: "url" },
  pinterest: { label: "Pinterest", placeholder: "pinterest.com/username", kind: "url" },
  reddit: { label: "Reddit", placeholder: "reddit.com/u/username", kind: "url" },
  dribbble: { label: "Dribbble", placeholder: "dribbble.com/username", kind: "url" },
  signal: { label: "Signal", placeholder: "signal.me/#p/...", kind: "url" },
  messenger: { label: "Messenger", placeholder: "m.me/username", kind: "url" },
  tripadvisor: { label: "TripAdvisor", placeholder: "tripadvisor.com/...", kind: "url" },
  yelp: { label: "Yelp", placeholder: "yelp.com/biz/...", kind: "url" },
  googlereviews: { label: "Google Reviews", placeholder: "g.page/r/...", kind: "url" },
  tumblr: { label: "Tumblr", placeholder: "username.tumblr.com", kind: "url" },
  viber: { label: "Viber", placeholder: "+1 555 123 4567", kind: "tel" },
  line: { label: "LINE", placeholder: "line.me/ti/p/...", kind: "url" },
  doordash: { label: "DoorDash", placeholder: "doordash.com/store/...", kind: "url" },
  xing: { label: "XING", placeholder: "xing.com/profile/...", kind: "url" },
  vk: { label: "VK", placeholder: "vk.com/username", kind: "url" },
  apple: { label: "Apple Music", placeholder: "music.apple.com/...", kind: "url" },
  netflix: { label: "Netflix", placeholder: "netflix.com/title/...", kind: "url" },
  outlook: { label: "Outlook", placeholder: "name@outlook.com", kind: "email" },
  gmail: { label: "Gmail", placeholder: "name@gmail.com", kind: "email" },
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

  switch (type) {
    case "phone":
    case "viber":
      return `tel:${v.replace(/[^\d+]/g, "")}`;
    case "email":
    case "gmail":
    case "outlook":
      return v.includes("@") ? `mailto:${v}` : `mailto:${v}@gmail.com`;
    case "whatsapp": {
      const cleanNum = v.replace(/[^\d]/g, "");
      return cleanNum ? `https://wa.me/${cleanNum}` : null;
    }
    case "telegram":
      return v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/, "")}`;
    case "instagram":
      return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
    case "x":
    case "twitter":
      return v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}`;
    case "facebook":
      return v.startsWith("http") ? v : `https://facebook.com/${v}`;
    case "linkedin":
      return v.startsWith("http") ? v : `https://linkedin.com/in/${v.replace(/^@/, "")}`;
    case "youtube":
      return v.startsWith("http") ? v : `https://youtube.com/${v.startsWith("@") ? v : "@" + v}`;
    case "tiktok":
      return v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/, "")}`;
    case "github":
      return v.startsWith("http") ? v : `https://github.com/${v.replace(/^@/, "")}`;
    case "messenger":
      return v.startsWith("http") ? v : `https://m.me/${v}`;
    case "snapchat":
      return v.startsWith("http") ? v : `https://snapchat.com/add/${v}`;
    case "pinterest":
      return v.startsWith("http") ? v : `https://pinterest.com/${v}`;
    case "reddit":
      return v.startsWith("http") ? v : `https://reddit.com/u/${v}`;
    case "website":
    case "url":
      return normalizeUrl(v);
    default:
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
  avatarUrl?: string | null;
  cardUrl?: string | null;
  street?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  note?: string | null;
  fields?: { type: string; value: string }[];
  socials?: Record<string, string>;
};

// Build a valid, comprehensive vCard 3.0 (.vcf) string.
export function buildVcard(input: VcardInput): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcf(input.fullName)}`];

  const parts = input.fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    const last = parts.pop();
    const first = parts.join(" ");
    lines.push(`N:${escapeVcf(last!)};${escapeVcf(first)};;;`);
  } else {
    lines.push(`N:;${escapeVcf(input.fullName)};;;`);
  }

  if (input.company) lines.push(`ORG:${escapeVcf(input.company)}`);
  if (input.title) lines.push(`TITLE:${escapeVcf(input.title)}`);

  // Address
  const street = input.street?.trim() || "";
  const city = input.city?.trim() || "";
  const country = input.country?.trim() || "";
  if (street || city || country) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVcf(street)};${escapeVcf(city)};;;${escapeVcf(country)}`);
  } else if (input.address?.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVcf(input.address.trim())};;;;`);
  }

  if (input.note?.trim()) {
    lines.push(`NOTE:${escapeVcf(input.note.trim())}`);
  }

  // Avatar / Photo
  if (input.avatarUrl) {
    if (input.avatarUrl.startsWith("data:image/")) {
      const match = input.avatarUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const type = match[1].toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${match[2]}`);
      }
    } else if (/^https?:\/\//i.test(input.avatarUrl)) {
      lines.push(`PHOTO;VALUE=URI:${escapeVcf(input.avatarUrl)}`);
    }
  }

  // Dynamic fields
  if (input.fields) {
    for (const f of input.fields) {
      const val = f.value.trim();
      if (!val) continue;
      switch (f.type) {
        case "phone":
        case "viber":
          lines.push(`TEL;TYPE=CELL,VOICE:${escapeVcf(val)}`);
          break;
        case "email":
        case "gmail":
        case "outlook":
          lines.push(`EMAIL;TYPE=INTERNET:${escapeVcf(val)}`);
          break;
        case "website":
          lines.push(`URL:${escapeVcf(normalizeUrl(val))}`);
          break;
        default: {
          const url = hrefForField(f.type, val);
          if (url) {
            lines.push(`X-SOCIALPROFILE;TYPE=${escapeVcf(f.type)}:${escapeVcf(url)}`);
          } else {
            lines.push(`NOTE:${escapeVcf(`${f.type}: ${val}`)}`);
          }
          break;
        }
      }
    }
  }

  // Structured socials
  if (input.socials) {
    for (const [net, val] of Object.entries(input.socials)) {
      const v = val?.trim();
      if (!v) continue;
      const url = hrefForField(net, v) || v;
      lines.push(`X-SOCIALPROFILE;TYPE=${escapeVcf(net)}:${escapeVcf(url)}`);
    }
  }

  if (input.cardUrl) {
    lines.push(`URL:${escapeVcf(input.cardUrl)}`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}
