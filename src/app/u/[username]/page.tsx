import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";

export const revalidate = 60;

async function loadProfile(username: string) {
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.username, username.toLowerCase()))
    .limit(1);
  return profile ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username).catch(() => null);
  if (!profile) {
    return { title: "Page not found" };
  }
  const base = await getBaseUrl();
  const title = `${profile.displayName} (@${profile.username})`;
  const description = profile.bio || `${profile.displayName}'s links on Pastor.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/u/${profile.username}`,
      images: [`${base}/api/og/${profile.username}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base}/api/og/${profile.username}`],
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(username).catch(() => null);

  if (!profile) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="finder font-display text-2xl font-bold">
          This page doesn&apos;t exist yet
        </h1>
        <p className="mt-3 text-muted">
          <span className="font-mono">/u/{username}</span> hasn&apos;t been
          claimed. It could be yours.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-[8px] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90"
        >
          Claim this page
        </Link>
      </div>
    );
  }

  const links = await db
    .select({
      id: schema.links.id,
      title: schema.links.title,
      url: schema.links.url,
      shortSlug: schema.links.shortSlug,
    })
    .from(schema.links)
    .where(
      and(
        eq(schema.links.userId, profile.userId),
        eq(schema.links.isActive, true),
      ),
    )
    .orderBy(asc(schema.links.position));

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-2xl font-semibold uppercase">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            profile.displayName.charAt(0)
          )}
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p className="mt-1 max-w-sm text-sm text-muted">{profile.bio}</p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {links.length === 0 ? (
          <p className="text-center text-sm text-muted">No links yet.</p>
        ) : (
          links.map((link) => (
            <a
              key={link.id}
              href={link.shortSlug ? `/r/${link.shortSlug}` : link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-[12px] border border-border bg-surface px-5 py-4 text-center font-medium transition-colors hover:border-accent hover:bg-accent/5"
            >
              {link.title}
            </a>
          ))
        )}
      </div>

      <footer className="mt-12 text-center">
        <Link href="/" className="text-xs text-muted hover:text-ink">
          Made with Pastor
        </Link>
      </footer>
    </div>
  );
}
