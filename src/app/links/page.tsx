import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "My Links" };

export default async function LinksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [profileRow] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);

  const base = await getBaseUrl();

  if (!profileRow) {
    return <Onboarding suggestedName={user.name} />;
  }

  const links = await db
    .select()
    .from(schema.links)
    .where(eq(schema.links.userId, user.id))
    .orderBy(asc(schema.links.position));

  return (
    <Dashboard
      baseUrl={base}
      profile={{
        username: profileRow.username,
        displayName: profileRow.displayName,
        bio: profileRow.bio,
        avatarUrl: profileRow.avatarUrl,
      }}
      links={links.map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url,
        isActive: l.isActive,
        clicks: l.clicks,
        shortSlug: l.shortSlug,
      }))}
    />
  );
}
