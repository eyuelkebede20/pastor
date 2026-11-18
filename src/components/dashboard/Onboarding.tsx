"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkUsername, createProfile } from "@/actions/profile";
import { Label, PageHeading } from "@/components/ui";
import { processAvatarFile } from "@/lib/avatar";

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
  const [avatarUrl, setAvatarUrl] = useState("");
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processAvatarFile(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await createProfile({ username, displayName, avatarUrl: avatarUrl || undefined });
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
        subtitle="Pick a username and profile photo. You can add links next."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <div>
          <Label>Profile Avatar (optional)</Label>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-lg font-semibold uppercase shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0) || "👤"
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="inline-block cursor-pointer rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:opacity-90 transition">
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="ml-2 text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              )}
              <p className="text-[11px] text-muted">
                JPG, PNG, or WebP. Auto-cropped & optimized.
              </p>
            </div>
          </div>
        </div>

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
          className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40 transition"
        >
          {busy ? "Creating…" : "Create my page"}
        </button>
      </form>
    </div>
  );
}
