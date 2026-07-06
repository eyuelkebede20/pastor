import type { ReactNode } from "react";

// Simple monochrome glyphs (currentColor) for each builtin field type. Custom
// fields render their chosen emoji instead. Kept generic/geometric on purpose.

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, ReactNode> = {
  phone: (
    <path d="M4 5c0 8 7 15 15 15l0-3.5-4-1.5-2 2c-2.5-1.2-4.8-3.5-6-6l2-2-1.5-4L4 5Z" />
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.4-4A8 8 0 1 1 8 18.6L4 20Z" />
      <path d="M9 9c0 3 3 6 6 6 1-1 1-1.5 0-2l-1.5-.5-1 1c-1-.5-1.5-1-2-2l1-1L11 8c-.5-1-1-1-2 0Z" fill="currentColor" stroke="none" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M4 4l16 16M20 4L4 20" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" />
    </>
  ),
  github: (
    <path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 4.5-1.4 4.5-5a3.9 3.9 0 0 0-1-2.7 3.6 3.6 0 0 0-.1-2.7s-1-.3-3 1a12 12 0 0 0-6 0c-2-1.3-3-1-3-1a3.6 3.6 0 0 0-.1 2.7A3.9 3.9 0 0 0 5 10c0 3.6 1.7 4.7 4.5 5-.4.4-.5.9-.5 1.7V21" />
  ),
  tiktok: (
    <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.5 2 4 4.5 4.2" />
  ),
  facebook: (
    <path d="M14 8h2M14 8V6.5c0-.8.7-1.5 1.5-1.5H16M14 8v3m0 0h-2m2 0v8" />
  ),
};

export function FieldIcon({
  type,
  icon,
  size = 18,
}: {
  type: string;
  icon?: string | null;
  size?: number;
}) {
  if (type === "custom" || !GLYPHS[type]) {
    return (
      <span style={{ fontSize: size - 2, lineHeight: 1 }} aria-hidden>
        {icon || "🔗"}
      </span>
    );
  }
  return <Svg size={size}>{GLYPHS[type]}</Svg>;
}
