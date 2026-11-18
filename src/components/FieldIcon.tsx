import type { ReactNode } from "react";

// Simple monochrome glyphs (currentColor) for each builtin field type. Custom
// fields render their chosen emoji instead.

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
      <path
        d="M9 9c0 3 3 6 6 6 1-1 1-1.5 0-2l-1.5-.5-1 1c-1-.5-1.5-1-2-2l1-1L11 8c-.5-1-1-1-2 0Z"
        fill="currentColor"
        stroke="none"
      />
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
  telegram: (
    <path d="M21.5 4L2 11.5l6 2.5 2 6 3.5-4 5 3.5L21.5 4zM8 14l9-7-7 8v4l2.5-3" />
  ),
  snapchat: (
    <path d="M12 3a6 6 0 0 0-6 6c0 2.5 1 4 1 5-.5.5-2 .5-2.5 1-.5.5 0 1.5 1 1.5 1 0 2-.5 3-.5s1.5 1 2.5 1 2.5-1 2.5-1 2 .5 3 .5c1 0 1.5-1 1-1.5-.5-.5-2-.5-2.5-1 0-1 1-2.5 1-5a6 6 0 0 0-6-6z" />
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 18c1-2.5 1.5-5 2-7.5-.5-1 .5-2.5 1.5-2.5 1 0 1.5 1 1.5 2 0 2-1 3.5-.5 5 .5 1.5 2.5 1.5 3 0s1-3.5 1-5c0-3-2-4.5-5-4.5-3.5 0-5.5 2.5-5.5 5.5 0 1 .5 2 1 2.5" />
    </>
  ),
  reddit: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="11.5" r="1" fill="currentColor" />
      <path d="M9 15c1 1 5 1 6 0" />
    </>
  ),
  dribbble: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M19.13 5.09C15.22 9.14 10 10.44 3 10.44M3.7 15.75c3.67-.78 8.44-.33 11.5 4.38M9.5 3.5c1.8 3.5 3.5 8.5 4.2 16.8" />
    </>
  ),
  signal: (
    <>
      <path d="M12 3a9 9 0 0 0-9 9c0 2.2.8 4.2 2.1 5.8L4 21l3.5-1.1c1.3.7 2.9 1.1 4.5 1.1a9 9 0 1 0 0-18z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  tripadvisor: (
    <>
      <circle cx="7" cy="13" r="3" />
      <circle cx="17" cy="13" r="3" />
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="17" cy="13" r="1" fill="currentColor" />
      <path d="M4 10c2-2 5-3 8-3s6 1 8 3M12 7v3" />
    </>
  ),
  yelp: (
    <path d="M12 11l-2-6a1 1 0 0 1 1.5-1.1L14 7l-2 4zm1 3l5 3a1 1 0 0 1 .3 1.8L14 20l-1-6zm-3 1l-5 4a1 1 0 0 1-1.5-.9L6 13l4 2zm-1-3l-6-1a1 1 0 0 1-.2-2L9 8l1 4zm4 0l6-1a1 1 0 0 1 1 1.7L15 15l-1-3z" />
  ),
  googlereviews: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  ),
  tumblr: (
    <path d="M10 5v3h4v3h-4v6c0 1.5 1 2 2.5 2H15v3h-3.5C8.5 22 7 20 7 17v-6H4V8c2.5 0 3-2 3-3h3z" />
  ),
  viber: (
    <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4 4c0 3 2 5 5 5" />
  ),
  line: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="4" />
      <path d="M8 9v6M12 9v6h2.5M16 9v6" />
    </>
  ),
  doordash: (
    <path d="M3 13.5C3 9.4 6.4 6 10.5 6h9.5v3h-9.5C8 9 6 11 6 13.5S8 18 10.5 18H20v3h-9.5C6.4 21 3 17.6 3 13.5z" />
  ),
  xing: (
    <path d="M6 7l3.5 6L6 19h3l3.5-6L9 7H6zm10-4l-5 9 3 5.5h3L14 12l5-9h-3z" />
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
