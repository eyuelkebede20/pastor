import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";
import { buildVcard } from "@/lib/card-fields";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [card] = await db
    .select({
      companyId: schema.cards.companyId,
      fullName: schema.cards.fullName,
      title: schema.cards.title,
      values: schema.cards.values,
      company: schema.companies.name,
    })
    .from(schema.cards)
    .innerJoin(schema.companies, eq(schema.cards.companyId, schema.companies.id))
    .where(eq(schema.cards.publicId, id))
    .limit(1);

  if (!card) return new Response("Not found", { status: 404 });

  const fields = await db
    .select({ id: schema.cardFields.id, type: schema.cardFields.type })
    .from(schema.cardFields)
    .where(eq(schema.cardFields.companyId, card.companyId))
    .orderBy(asc(schema.cardFields.position));

  const base = await getBaseUrl();
  const values = card.values ?? {};
  const vcf = buildVcard({
    fullName: card.fullName,
    title: card.title,
    company: card.company,
    cardUrl: `${base}/c/${id}`,
    fields: fields.map((f) => ({ type: f.type, value: values[f.id] ?? "" })),
  });

  const safeName = card.fullName.replace(/[^\w.-]+/g, "_") || "contact";
  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.vcf"`,
    },
  });
}
