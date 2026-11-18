"use client";

import { useId, useState, useTransition } from "react";
import { Label } from "@/components/ui";
import { FieldIcon } from "@/components/FieldIcon";
import { FIELD_TYPES, VCARD_COLOR_PRESETS, type FieldType } from "@/lib/card-fields";
import { processAvatarFile } from "@/lib/avatar";
import { createCardWithDetails, deleteCard, saveCard } from "@/actions/cards";

export type CardFieldDef = {
  id: string;
  label: string;
  type: string;
  icon: string | null;
};

export type CardData = {
  id?: string;
  publicId?: string;
  fullName: string;
  title: string | null;
  values: Record<string, string>;
};

export function CardEditModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  fields,
  initialCard,
  baseUrl,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  fields: CardFieldDef[];
  initialCard?: CardData | null;
  baseUrl: string;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initialCard?.id);
  const titleId = useId();

  const [fullName, setFullName] = useState(initialCard?.fullName ?? "");
  const [title, setTitle] = useState(initialCard?.title ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    initialCard?.values?._avatar ?? "",
  );
  const [priColor, setPriColor] = useState(
    initialCard?.values?._priColor ?? "#6594FF",
  );
  const [secColor, setSecColor] = useState(
    initialCard?.values?._secColor ?? "#FFFFFF",
  );
  const [values, setValues] = useState<Record<string, string>>(
    initialCard?.values ?? {},
  );

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!isOpen) return null;

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processAvatarFile(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to load image file.",
      );
    }
  }

  function handleSave() {
    setError(null);
    if (!fullName.trim()) {
      setError("Please enter a name for this card.");
      return;
    }

    const payloadValues: Record<string, string> = {
      ...values,
      _priColor: priColor,
      _secColor: secColor,
    };

    start(async () => {
      try {
        if (isEditing && initialCard?.id) {
          const res = await saveCard({
            id: initialCard.id,
            fullName,
            title,
            avatarUrl,
            values: payloadValues,
          });
          if (res.ok) {
            onSaved();
            onClose();
          } else {
            setError(res.error);
          }
        } else {
          const res = await createCardWithDetails({
            companyId,
            fullName,
            title,
            avatarUrl,
            values: payloadValues,
          });
          if (res.ok) {
            onSaved();
            onClose();
          } else {
            setError(res.error);
          }
        }
      } catch {
        setError("Failed to save business card. Please try again.");
      }
    });
  }

  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold">
              {isEditing ? "Edit Business Card" : "New Business Card"}
            </h2>
            <p className="text-xs text-muted">
              {companyName} · Scannable Digital ID
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-ink transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Two columns on desktop (Form + Live Card Preview) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
            {/* Left: Input Form */}
            <div className="space-y-5">
              {/* Avatar Section */}
              <div>
                <Label>Avatar / Profile Photo</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-bg text-xl font-bold uppercase shadow-sm">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted">{initials || "👤"}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:opacity-90 transition">
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
                          className="rounded-[8px] border border-border px-3 py-1.5 text-xs text-muted hover:text-danger hover:border-danger transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted">
                      Supports JPG, PNG, WebP or SVG. Auto-optimized for instant
                      loading.
                    </p>
                  </div>
                </div>
                {avatarError && (
                  <p className="mt-1 text-xs text-danger">{avatarError}</p>
                )}
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="card-fullname">Full Name *</Label>
                  <input
                    id="card-fullname"
                    placeholder="e.g. Sarah Connor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <Label htmlFor="card-title">Job Title / Role</Label>
                  <input
                    id="card-title"
                    placeholder="e.g. Chief Executive Officer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Color Scheme (Inspired by ass.html) */}
              <div className="space-y-2.5 rounded-[10px] border border-border bg-bg/40 p-3.5">
                <div className="flex items-center justify-between">
                  <Label>Color Scheme</Label>
                  <span className="text-[11px] text-muted">Primary & Secondary</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VCARD_COLOR_PRESETS.map((preset, idx) => {
                    const isSelected =
                      priColor.toLowerCase() === preset.fg.toLowerCase() &&
                      secColor.toLowerCase() === preset.bg.toLowerCase();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPriColor(preset.fg);
                          setSecColor(preset.bg);
                        }}
                        title={preset.label}
                        className={`flex items-center gap-1.5 rounded-[8px] border p-1.5 transition ${
                          isSelected
                            ? "border-accent ring-2 ring-accent/30 bg-accent/5 shadow-xs"
                            : "border-border hover:border-muted"
                        }`}
                      >
                        <div
                          className="size-4.5 rounded-[3px] border border-black/10"
                          style={{ backgroundColor: preset.fg }}
                        />
                        <div
                          className="size-4.5 rounded-[3px] border border-black/10"
                          style={{ backgroundColor: preset.bg }}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-muted">
                      Primary color
                    </label>
                    <div className="mt-1 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1">
                      <input
                        type="color"
                        value={priColor}
                        onChange={(e) => setPriColor(e.target.value)}
                        className="size-6 cursor-pointer rounded-[4px] border-none bg-transparent"
                      />
                      <input
                        type="text"
                        value={priColor.toUpperCase()}
                        onChange={(e) => setPriColor(e.target.value)}
                        maxLength={7}
                        className="w-full bg-transparent font-mono text-xs uppercase outline-none text-ink"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-medium text-muted">
                      Secondary color
                    </label>
                    <div className="mt-1 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1">
                      <input
                        type="color"
                        value={secColor}
                        onChange={(e) => setSecColor(e.target.value)}
                        className="size-6 cursor-pointer rounded-[4px] border-none bg-transparent"
                      />
                      <input
                        type="text"
                        value={secColor.toUpperCase()}
                        onChange={(e) => setSecColor(e.target.value)}
                        maxLength={7}
                        className="w-full bg-transparent font-mono text-xs uppercase outline-none text-ink"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Field Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Contact & Channels
                  </h3>
                  <span className="text-xs text-muted">
                    {fields.length} columns configured
                  </span>
                </div>

                {fields.length === 0 ? (
                  <p className="rounded-[8px] border border-dashed border-border p-4 text-center text-xs text-muted">
                    No columns added for this company yet. You can add columns
                    from the company dashboard.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {fields.map((f) => {
                      const placeholder =
                        FIELD_TYPES[f.type as FieldType]?.placeholder ??
                        `Enter ${f.label.toLowerCase()}`;
                      return (
                        <div key={f.id}>
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
                            <span className="shrink-0">
                              <FieldIcon
                                type={f.type}
                                icon={f.icon}
                                size={16}
                              />
                            </span>
                            <span>{f.label}</span>
                          </label>
                          <input
                            value={values[f.id] ?? ""}
                            placeholder={placeholder}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [f.id]: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-[8px] border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Virtual Card Preview (Matching ass.html) */}
            <div className="flex flex-col items-center justify-start border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="mb-2 w-full text-center text-xs font-medium text-muted">
                Live Card Preview
              </p>

              {/* Virtual ID Card mockup */}
              <div className="w-full max-w-[270px] overflow-hidden rounded-[24px] border border-border bg-surface shadow-xl">
                {/* Hero Banner with Custom Theme Colors */}
                <div
                  className="pt-6 pb-5 px-4 text-center relative transition-colors"
                  style={{ backgroundColor: priColor, color: secColor }}
                >
                  {/* Avatar */}
                  <div className="size-16 rounded-full border-3 border-white/85 mx-auto overflow-hidden shadow-md flex items-center justify-center bg-zinc-900 text-white font-bold text-lg">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials || "?"
                    )}
                  </div>

                  {/* Name & Title */}
                  <div className="mt-2.5">
                    <h4 className="truncate font-display text-base font-bold">
                      {fullName || "Person Name"}
                    </h4>
                    <p className="truncate text-xs opacity-90 font-medium">
                      {title || "Job Title"}
                    </p>
                    {companyName && (
                      <span className="mt-1 inline-block text-[10px] font-semibold opacity-80 uppercase tracking-wider">
                        {companyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content & Field badges */}
                <div className="p-3 bg-bg/50 space-y-2">
                  <div className="space-y-1.5">
                    {fields
                      .map((f) => ({ field: f, val: values[f.id] }))
                      .filter(({ val }) => val && val.trim().length > 0)
                      .slice(0, 5)
                      .map(({ field, val }) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 rounded-[8px] border border-border/80 bg-surface px-2.5 py-1.5 text-[11px] shadow-2xs"
                        >
                          <FieldIcon
                            type={field.type}
                            icon={field.icon}
                            size={18}
                          />
                          <span className="truncate text-ink font-medium">
                            {val}
                          </span>
                        </div>
                      ))}
                    {Object.values(values).filter(
                      (v) =>
                        v &&
                        v.trim() &&
                        !v.startsWith("#") &&
                        !v.startsWith("data:image/"),
                    ).length > 5 && (
                      <p className="text-center text-[10px] text-muted">
                        +
                        {Object.values(values).filter(
                          (v) =>
                            v &&
                            v.trim() &&
                            !v.startsWith("#") &&
                            !v.startsWith("data:image/"),
                        ).length - 5}{" "}
                        more channels
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg/40 px-5 py-3">
          <div>
            {isEditing && initialCard?.id && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete ${initialCard.fullName}?`,
                    )
                  ) {
                    start(async () => {
                      await deleteCard({ id: initialCard.id! });
                      onSaved();
                      onClose();
                    });
                  }
                }}
                disabled={pending}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                Delete this card
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {error && <p className="text-xs text-danger mr-2">{error}</p>}
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-[8px] border border-border px-4 py-2 text-sm font-medium hover:bg-bg disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-[8px] bg-accent px-5 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-50 transition"
            >
              {pending
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : "Create Business Card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
