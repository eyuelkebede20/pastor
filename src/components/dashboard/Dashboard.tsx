"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { QRModal } from "@/components/QRModal";
import { Label } from "@/components/ui";
import {
  addLink,
  deleteLink,
  editLink,
  moveLink,
  toggleLink,
} from "@/actions/links";
import { updateProfile } from "@/actions/profile";

const inputCls =
  "w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export type DashProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type DashLink = {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
  shortSlug: string | null;
};

export function Dashboard({
  baseUrl,
  profile,
  links,
}: {
  baseUrl: string;
  profile: DashProfile;
  links: DashLink[];
}) {
  const publicUrl = `${baseUrl}/u/${profile.username}`;
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="finder font-display text-2xl font-bold tracking-tight sm:text-3xl">
        My Links
      </h1>

      <ProfileHeader
        profile={profile}
        publicUrl={publicUrl}
        onShowQR={() => setShowQR(true)}
      />

      <LinkManager links={links} username={profile.username} />

      {showQR && (
        <QRModal
          data={publicUrl}
          title="Your page QR"
          downloadName={profile.username}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

function ProfileHeader({
  profile,
  publicUrl,
  onShowQR,
}: {
  profile: DashProfile;
  publicUrl: string;
  onShowQR: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await updateProfile({ displayName, bio, avatarUrl });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      {editing ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <input
              id="dn"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={2}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label htmlFor="av">Avatar image URL</Label>
            <input
              id="av"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-[8px] border border-border px-4 py-2 text-sm font-medium hover:bg-bg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg text-lg font-semibold uppercase">
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
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold">{profile.displayName}</p>
            {profile.bio && (
              <p className="mt-0.5 text-sm text-muted">{profile.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate font-mono text-sm text-accent hover:underline"
              >
                {publicUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={publicUrl} label="Copy link" />
              <button
                type="button"
                onClick={onShowQR}
                className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg"
              >
                Show QR
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg"
              >
                Edit profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkManager({
  links,
  username,
}: {
  links: DashLink[];
  username: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Links</h2>
        <span className="text-sm text-muted">{links.length}/50</span>
      </div>

      {links.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No links yet. Add your first one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, i) => (
            <LinkRow
              key={link.id}
              link={link}
              username={username}
              isFirst={i === 0}
              isLast={i === links.length - 1}
            />
          ))}
        </ul>
      )}

      <AddLinkForm disabled={links.length >= 50} />
    </div>
  );
}

function LinkRow({
  link,
  isFirst,
  isLast,
}: {
  link: DashLink;
  username: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else router.refresh();
    });
  };

  if (editing) {
    return (
      <li className="rounded-[12px] border border-border bg-surface p-4">
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputCls}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = await editLink({ id: link.id, title, url });
                  if (res.ok) setEditing(false);
                  return res;
                })
              }
              className="rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setTitle(link.title);
                setUrl(link.url);
              }}
              className="rounded-[8px] border border-border px-4 py-2 text-sm font-medium hover:bg-bg"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-[12px] border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        {/* Reorder arrows */}
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={isFirst || pending}
            onClick={() => run(() => moveLink({ id: link.id, direction: "up" }))}
            className="px-1 text-muted hover:text-ink disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={isLast || pending}
            onClick={() =>
              run(() => moveLink({ id: link.id, direction: "down" }))
            }
            className="px-1 text-muted hover:text-ink disabled:opacity-30"
          >
            ▼
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${!link.isActive && "text-muted"}`}>
            {link.title}
          </p>
          <p className="truncate font-mono text-xs text-muted">{link.url}</p>
        </div>

        <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
          {link.clicks} {link.clicks === 1 ? "click" : "clicks"}
        </span>

        {/* Active toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={link.isActive}
          aria-label={link.isActive ? "Active" : "Hidden"}
          disabled={pending}
          onClick={() =>
            run(() => toggleLink({ id: link.id, isActive: !link.isActive }))
          }
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            link.isActive ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-all ${
              link.isActive ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-bg"
        >
          Edit
        </button>

        {confirmDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteLink({ id: link.id }))}
            className="shrink-0 rounded-[8px] border border-danger/40 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/5"
          >
            Confirm
          </button>
        ) : (
          <button
            type="button"
            aria-label="Delete link"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}

function AddLinkForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disabled) {
    return (
      <p className="text-sm text-muted">
        You&apos;ve reached the 50-link limit.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-[8px] border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
      >
        + Add link
      </button>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await addLink({ title, url });
      if (res.ok) {
        setTitle("");
        setUrl("");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2 rounded-[12px] border border-border bg-surface p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. My portfolio)"
        className={inputCls}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className={inputCls}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-[8px] border border-border px-4 py-2 text-sm font-medium hover:bg-bg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
