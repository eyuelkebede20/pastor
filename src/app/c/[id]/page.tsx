import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";
import { hrefForField } from "@/lib/card-fields";
import { FieldIcon } from "@/components/FieldIcon";

export const revalidate = 60;

async function loadCard(publicId: string) {
  const [card] = await db
    .select({
      id: schema.cards.id,
      companyId: schema.cards.companyId,
      fullName: schema.cards.fullName,
      title: schema.cards.title,
      values: schema.cards.values,
      company: schema.companies.name,
    })
    .from(schema.cards)
    .innerJoin(schema.companies, eq(schema.cards.companyId, schema.companies.id))
    .where(eq(schema.cards.publicId, publicId))
    .limit(1);
  if (!card) return null;

  const fields = await db
    .select()
    .from(schema.cardFields)
    .where(eq(schema.cardFields.companyId, card.companyId))
    .orderBy(asc(schema.cardFields.position));

  return { card, fields };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await loadCard(id).catch(() => null);
  if (!data) return { title: "Card not found" };
  const base = await getBaseUrl();
  const title = `${data.card.fullName}${data.card.company ? ` · ${data.card.company}` : ""}`;
  const description = data.card.title || `Digital card for ${data.card.fullName}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/c/${id}`,
      images: [`${base}/api/og/card/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base}/api/og/card/${id}`],
    },
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadCard(id).catch(() => null);

  if (!data) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="finder font-display text-2xl font-bold">
          Card not found
        </h1>
        <p className="mt-3 text-muted">
          This card doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[8px] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
        >
          Go home
        </Link>
      </div>
    );
  }

  const { card, fields } = data;
  const values = card.values ?? {};
  const avatar = values["_avatar"] || null;
  const priColor = values["_priColor"] || "#6594FF";
  const secColor = values["_secColor"] || "#FFFFFF";

  const rows = fields
    .map((f) => ({ field: f, value: (values[f.id] ?? "").trim() }))
    .filter((r) => r.value.length > 0);

  const initials = card.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-md py-4 sm:py-6">
      <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-xl">
        {/* Hero Banner with Custom Theme Colors from ass.html */}
        <div
          className="pt-8 pb-7 px-6 text-center relative transition-colors shadow-xs"
          style={{ backgroundColor: priColor, color: secColor }}
        >
          {/* Avatar */}
          <div className="size-24 rounded-full border-4 border-white/85 mx-auto overflow-hidden shadow-lg flex items-center justify-center bg-zinc-950 text-white font-bold text-2xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={card.fullName}
                className="size-full object-cover"
              />
            ) : (
              initials || "?"
            )}
          </div>

          <div className="mt-3.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {card.fullName}
            </h1>
            {card.title && (
              <p className="mt-0.5 text-sm font-medium opacity-90">
                {card.title}
              </p>
            )}
            {card.company && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-80">
                {card.company}
              </p>
            )}
          </div>

          <a
            href={`/api/card/${id}/vcard.vcf`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/90 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-black transition active:scale-95"
          >
            <span>⊕</span>
            <span>Save to contacts</span>
          </a>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map(({ field, value }) => {
                const href = hrefForField(field.type, value);
                const inner = (
                  <>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border/80 bg-bg/60">
                      <FieldIcon
                        type={field.type}
                        icon={field.icon}
                        size={24}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-muted">
                        {field.label}
                      </span>
                      <span className="block truncate text-sm font-semibold text-ink">
                        {value}
                      </span>
                    </span>
                    {href && (
                      <span className="text-muted text-xs font-semibold pr-1">
                        ›
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={field.id}>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-[12px] border border-border px-3.5 py-2.5 transition-colors hover:border-accent hover:bg-accent/5 shadow-2xs"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 rounded-[12px] border border-border px-3.5 py-2.5 shadow-2xs">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <details className="rounded-[10px] border border-border bg-bg/30">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-center text-xs font-semibold text-muted hover:text-ink transition">
                Show QR Code
              </summary>
              <div className="flex flex-col items-center justify-center border-t border-border p-4 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/card/${id}/qr.svg`}
                  alt="QR code for this card"
                  className="h-44 w-44"
                />
                <p className="mt-2 text-xs text-muted">
                  Scan to view or share this digital card
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <Link href="/" className="text-xs text-muted hover:text-ink">
          Made with Pastor
        </Link>
      </footer>
    </div>
  );
}
