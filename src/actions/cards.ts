"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { newCardId } from "@/lib/slugs";
import { FIELD_TYPES, isKnownType } from "@/lib/card-fields";

const MAX_COMPANIES = 50;
const MAX_FIELDS = 20;
const MAX_CARDS = 500;

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

async function ownedCompany(companyId: string, userId: string) {
  const [c] = await db
    .select({ id: schema.companies.id, name: schema.companies.name })
    .from(schema.companies)
    .where(
      and(
        eq(schema.companies.id, companyId),
        eq(schema.companies.userId, userId),
      ),
    )
    .limit(1);
  return c ?? null;
}

async function ownedField(fieldId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.cardFields.id, companyId: schema.cardFields.companyId })
    .from(schema.cardFields)
    .innerJoin(
      schema.companies,
      eq(schema.cardFields.companyId, schema.companies.id),
    )
    .where(
      and(eq(schema.cardFields.id, fieldId), eq(schema.companies.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

async function ownedCard(cardId: string, userId: string) {
  const [row] = await db
    .select({
      id: schema.cards.id,
      publicId: schema.cards.publicId,
      companyId: schema.cards.companyId,
      values: schema.cards.values,
    })
    .from(schema.cards)
    .innerJoin(schema.companies, eq(schema.cards.companyId, schema.companies.id))
    .where(and(eq(schema.cards.id, cardId), eq(schema.companies.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ── companies ───────────────────────────────────────────────────────────────

export async function createCompany(input: {
  name: string;
}): Promise<ActionResult<{ companyId: string }>> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Add a company name." };
  if (name.length > 80) return { ok: false, error: "Name is too long." };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.companies)
    .where(eq(schema.companies.userId, user.id));
  if (count >= MAX_COMPANIES) {
    return { ok: false, error: `You've reached the ${MAX_COMPANIES}-company limit.` };
  }

  const [row] = await db
    .insert(schema.companies)
    .values({ userId: user.id, name })
    .returning({ id: schema.companies.id });

  // Seed with the most common columns so the grid isn't empty.
  await db.insert(schema.cardFields).values([
    { companyId: row.id, type: "phone", label: FIELD_TYPES.phone.label, position: 0 },
    { companyId: row.id, type: "email", label: FIELD_TYPES.email.label, position: 1 },
    { companyId: row.id, type: "website", label: FIELD_TYPES.website.label, position: 2 },
  ]);

  revalidatePath("/cards");
  return { ok: true, companyId: row.id };
}

export async function renameCompany(input: {
  id: string;
  name: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Add a company name." };
  await db
    .update(schema.companies)
    .set({ name })
    .where(
      and(eq(schema.companies.id, input.id), eq(schema.companies.userId, user.id)),
    );
  revalidatePath("/cards");
  return { ok: true };
}

export async function deleteCompany(input: { id: string }): Promise<ActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.companies)
    .where(
      and(eq(schema.companies.id, input.id), eq(schema.companies.userId, user.id)),
    );
  revalidatePath("/cards");
  return { ok: true };
}

// ── fields (columns) ──────────────────────────────────────────────────────────

export async function addField(input: {
  companyId: string;
  type: string;
  label?: string;
  icon?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownedCompany(input.companyId, user.id))) {
    return { ok: false, error: "Company not found." };
  }
  if (!isKnownType(input.type)) return { ok: false, error: "Unknown field type." };

  const isCustom = input.type === "custom";
  const label = (input.label ?? FIELD_TYPES[input.type].label).trim().slice(0, 40);
  if (!label) return { ok: false, error: "Add a column name." };
  if (isCustom && !input.icon?.trim()) {
    return { ok: false, error: "Add an icon for a custom column." };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.cardFields)
    .where(eq(schema.cardFields.companyId, input.companyId));
  if (count >= MAX_FIELDS) {
    return { ok: false, error: `You've reached the ${MAX_FIELDS}-column limit.` };
  }

  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number>`coalesce(max(${schema.cardFields.position}), -1)::int`,
    })
    .from(schema.cardFields)
    .where(eq(schema.cardFields.companyId, input.companyId));

  await db.insert(schema.cardFields).values({
    companyId: input.companyId,
    type: input.type,
    label,
    icon: isCustom ? input.icon!.trim().slice(0, 16) : null,
    position: maxPos + 1,
  });

  revalidatePath("/cards");
  return { ok: true };
}

export async function updateField(input: {
  id: string;
  label: string;
  icon?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const field = await ownedField(input.id, user.id);
  if (!field) return { ok: false, error: "Column not found." };
  const label = input.label.trim().slice(0, 40);
  if (!label) return { ok: false, error: "Add a column name." };
  await db
    .update(schema.cardFields)
    .set({ label, ...(input.icon !== undefined ? { icon: input.icon.trim().slice(0, 16) || null } : {}) })
    .where(eq(schema.cardFields.id, input.id));
  revalidatePath("/cards");
  return { ok: true };
}

export async function deleteField(input: { id: string }): Promise<ActionResult> {
  const user = await requireUser();
  const field = await ownedField(input.id, user.id);
  if (!field) return { ok: false, error: "Column not found." };
  await db.delete(schema.cardFields).where(eq(schema.cardFields.id, input.id));
  revalidatePath("/cards");
  return { ok: true };
}

// ── cards (rows / people) ─────────────────────────────────────────────────────

export async function addCard(input: {
  companyId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await ownedCompany(input.companyId, user.id))) {
    return { ok: false, error: "Company not found." };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.cards)
    .where(eq(schema.cards.companyId, input.companyId));
  if (count >= MAX_CARDS) {
    return { ok: false, error: `You've reached the ${MAX_CARDS}-person limit.` };
  }

  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number>`coalesce(max(${schema.cards.position}), -1)::int`,
    })
    .from(schema.cards)
    .where(eq(schema.cards.companyId, input.companyId));

  await db.insert(schema.cards).values({
    companyId: input.companyId,
    publicId: newCardId(),
    fullName: "New person",
    position: maxPos + 1,
  });

  revalidatePath("/cards");
  return { ok: true };
}

export async function updateCard(input: {
  id: string;
  fullName?: string;
  title?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const card = await ownedCard(input.id, user.id);
  if (!card) return { ok: false, error: "Person not found." };

  const patch: { fullName?: string; title?: string | null } = {};
  if (input.fullName !== undefined) {
    const fn = input.fullName.trim().slice(0, 80);
    patch.fullName = fn || "Unnamed";
  }
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 80) || null;

  await db.update(schema.cards).set(patch).where(eq(schema.cards.id, input.id));
  revalidatePath("/cards");
  revalidatePath(`/c/${card.publicId}`);
  return { ok: true };
}

export async function setCardValue(input: {
  id: string;
  fieldId: string;
  value: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const card = await ownedCard(input.id, user.id);
  if (!card) return { ok: false, error: "Person not found." };

  const values = { ...(card.values ?? {}) };
  const v = input.value.slice(0, 300);
  if (v.trim()) values[input.fieldId] = v;
  else delete values[input.fieldId];

  await db
    .update(schema.cards)
    .set({ values })
    .where(eq(schema.cards.id, input.id));
  revalidatePath("/cards");
  revalidatePath(`/c/${card.publicId}`);
  return { ok: true };
}

export async function deleteCard(input: { id: string }): Promise<ActionResult> {
  const user = await requireUser();
  const card = await ownedCard(input.id, user.id);
  if (!card) return { ok: false, error: "Person not found." };
  await db.delete(schema.cards).where(eq(schema.cards.id, input.id));
  revalidatePath("/cards");
  return { ok: true };
}
