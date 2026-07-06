import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { CardsDashboard } from "@/components/cards/CardsDashboard";

export const metadata: Metadata = { title: "vCards" };

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const companies = await db
    .select({ id: schema.companies.id, name: schema.companies.name })
    .from(schema.companies)
    .where(eq(schema.companies.userId, user.id))
    .orderBy(asc(schema.companies.createdAt));

  const { c } = await searchParams;
  const selected =
    companies.find((co) => co.id === c) ?? companies[0] ?? null;

  const base = await getBaseUrl();

  let fields: (typeof schema.cardFields.$inferSelect)[] = [];
  let cards: (typeof schema.cards.$inferSelect)[] = [];
  if (selected) {
    [fields, cards] = await Promise.all([
      db
        .select()
        .from(schema.cardFields)
        .where(eq(schema.cardFields.companyId, selected.id))
        .orderBy(asc(schema.cardFields.position)),
      db
        .select()
        .from(schema.cards)
        .where(eq(schema.cards.companyId, selected.id))
        .orderBy(asc(schema.cards.position)),
    ]);
  }

  return (
    <CardsDashboard
      baseUrl={base}
      companies={companies}
      selectedId={selected?.id ?? null}
      fields={fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        icon: f.icon,
      }))}
      cards={cards.map((cd) => ({
        id: cd.id,
        publicId: cd.publicId,
        fullName: cd.fullName,
        title: cd.title,
        values: cd.values ?? {},
      }))}
    />
  );
}
