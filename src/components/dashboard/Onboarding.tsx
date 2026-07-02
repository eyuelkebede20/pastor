"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkUsername, createProfile } from "@/actions/profile";
import { Label, PageHeading } from "@/components/ui";

const inputCls =
  "w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; normalized: string }
  | { state: "bad"; reason: string };

export function Onboarding({ suggestedName }: { suggestedName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(suggestedName ?? "");
  const [avail, setAvail] = useState<Availability>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  function onUsernameChange(value: string) {
    const next = value.toLowerCase();
    setUsername(next);
    setAvail(next.trim() ? { state: "checking" } : { state: "idle" });
  }

  // Debounced live availability check. Only the async result is written here,
  // so no state is set synchronously during the effect.
  useEffect(() => {
    const value = username.trim();
    if (!value) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      const res = await checkUsername(value);
      if (id !== seq.current) return; // a newer keystroke won
      setAvail(
        res.available
          ? { state: "ok", normalized: res.normalized! }
          : { state: "bad", reason: res.reason ?? "Not available." },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await createProfile({ username, displayName });
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeading
        title="Claim your link page"
        subtitle="Pick a username and a name to show. You can add links next."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center rounded-[8px] border border-border bg-surface px-3 focus-within:border-accent">
            <span className="text-sm text-muted">/u/</span>
            <input
              id="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="yourname"
              autoCapitalize="none"
              autoComplete="off"
              className="w-full bg-transparent px-1 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 min-h-5 text-xs">
            {avail.state === "checking" && (
              <span className="text-muted">Checking…</span>
            )}
            {avail.state === "ok" && (
              <span className="text-accent">Available</span>
            )}
            {avail.state === "bad" && (
              <span className="text-danger">{avail.reason}</span>
            )}
          </p>
        </div>

        <div>
          <Label htmlFor="displayName">Display name</Label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || avail.state !== "ok" || !displayName.trim()}
          className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create my page"}
        </button>
      </form>
    </div>
  );
}
