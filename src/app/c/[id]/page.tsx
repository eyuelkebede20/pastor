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
    <div className="mx-auto max-w-md py-4">
      <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
        {/* accent header */}
        <div className="h-20 bg-accent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-surface bg-ink text-2xl font-bold text-accent-ink">
              {initials || "?"}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="font-display text-2xl font-bold">{card.fullName}</h1>
            {card.title && <p className="text-muted">{card.title}</p>}
            {card.company && (
              <p className="mt-1 text-sm font-medium text-accent">
                {card.company}
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <ul className="mt-6 space-y-2">
              {rows.map(({ field, value }) => {
                const href = hrefForField(field.type, value);
                const inner = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-bg text-accent">
                      <FieldIcon type={field.type} icon={field.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted">
                        {field.label}
                      </span>
                      <span className="block truncate text-sm font-medium">
                        {value}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={field.id}>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-[10px] border border-border px-3 py-2.5 transition-colors hover:border-accent hover:bg-accent/5"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 rounded-[10px] border border-border px-3 py-2.5">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <a
              href={`/api/card/${id}/vcard.vcf`}
              className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-ink hover:opacity-90"
            >
              Save to contacts
            </a>
            <details className="rounded-[8px] border border-border">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-center text-sm font-medium text-muted hover:text-ink">
                Show QR code
              </summary>
              <div className="flex justify-center border-t border-border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/card/${id}/qr.svg`}
                  alt="QR code for this card"
                  className="h-44 w-44"
                />
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
