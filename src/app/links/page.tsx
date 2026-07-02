import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PageHeading } from "@/components/ui";

// Placeholder for Phase 3. The full dashboard (profile onboarding + link CRUD)
// arrives in Phase 5.
export default async function LinksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeading
        title="My Links"
        subtitle={`Signed in as ${user.email}.`}
      />
      <p className="text-muted">Your link dashboard is coming soon.</p>
    </div>
  );
}
