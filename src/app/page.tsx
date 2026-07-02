import Link from "next/link";

function GenerateIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm9-2h3v3h-3v-3Zm4 4h3v3h-3v-3Zm-4 0h3v3h-3v-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h5v2H6v3H4V4Zm11 0h5v5h-2V6h-3V4ZM4 15h2v3h3v2H4v-5Zm16 0v5h-5v-2h3v-3h2ZM3 11h18v2H3v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41 1.41 1.42 1.42-1.42a3 3 0 0 1 4.24 4.24l-2.82 2.83a3 3 0 0 1-4.25 0l-1.41 1.41Zm4-2a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41-1.41-1.42-1.42 1.42a3 3 0 0 1-4.24-4.24l2.82-2.83a3 3 0 0 1 4.25 0L14 11Z"
        fill="currentColor"
      />
    </svg>
  );
}

const TOOLS = [
  {
    href: "/qr/generate",
    title: "QR Generator",
    body: "Turn any link or text into a crisp QR code. Customize colors and download PNG or SVG.",
    cta: "Make a QR code",
    icon: <GenerateIcon />,
  },
  {
    href: "/qr/scan",
    title: "QR Reader",
    body: "Scan with your camera or an image. Everything happens on your device — nothing is uploaded.",
    cta: "Scan a QR code",
    icon: <ScanIcon />,
  },
  {
    href: "/links",
    title: "Link page",
    body: "One simple page for all your links, with a matching QR code and a short shareable URL.",
    cta: "Build your page",
    icon: <LinkIcon />,
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notfound?: string }>;
}) {
  const { notfound } = await searchParams;
  return (
    <div>
      {notfound && (
        <p className="mb-6 rounded-[8px] border border-border bg-surface px-4 py-3 text-sm text-muted">
          That short link doesn’t exist (or expired).
        </p>
      )}
      <section className="mb-10 text-center sm:mb-14 sm:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          QR codes and a link page, made simple.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted sm:mx-0">
          Three small tools that each do one thing well. No account needed to
          generate or scan.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex flex-col rounded-[12px] border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <div className="mb-4 text-accent">{tool.icon}</div>
            <h2 className="font-display text-lg font-bold">{tool.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{tool.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
              {tool.cta}
              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
