"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { FieldIcon } from "@/components/FieldIcon";
import {
  FIELD_TYPES,
  FIELD_TYPE_ORDER,
  type FieldType,
} from "@/lib/card-fields";
import {
  addField,
  createCompany,
  deleteCard,
  deleteCompany,
  deleteField,
  renameCompany,
  setCardValue,
  updateCard,
  updateField,
} from "@/actions/cards";
import { CardEditModal, type CardData } from "./CardEditModal";
import { DataUploadModal } from "./DataUploadModal";

type Company = { id: string; name: string };
type Field = { id: string; label: string; type: string; icon: string | null };
type Card = {
  id: string;
  publicId: string;
  fullName: string;
  title: string | null;
  values: Record<string, string>;
};

const inputCls =
  "w-full rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent";
const cellCls =
  "w-full rounded-[6px] border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none hover:border-border focus:border-accent focus:bg-surface";

export function CardsDashboard({
  baseUrl,
  companies,
  selectedId,
  fields,
  cards,
}: {
  baseUrl: string;
  companies: Company[];
  selectedId: string | null;
  fields: Field[];
  cards: Card[];
}) {
  const selected = companies.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="finder font-display text-2xl font-bold tracking-tight sm:text-3xl">
          vCards
        </h1>
        <p className="mt-2 text-muted">
          Manage, customize, and share digital cards for your team and company.
        </p>
      </div>

      <CompanyBar companies={companies} selectedId={selectedId} />

      {!selected ? (
        <EmptyCompanies />
      ) : (
        <CompanyPanel
          key={selected.id}
          baseUrl={baseUrl}
          company={selected}
          fields={fields}
          cards={cards}
        />
      )}
    </div>
  );
}

function CompanyBar({
  companies,
  selectedId,
}: {
  companies: Company[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function create() {
    if (!name.trim()) return;
    start(async () => {
      const res = await createCompany({ name });
      if (res.ok) {
        setName("");
        setAdding(false);
        router.push(`/cards?c=${res.companyId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {companies.map((c) => (
        <Link
          key={c.id}
          href={`/cards?c=${c.id}`}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            c.id === selectedId
              ? "border-accent bg-accent/10 text-accent font-semibold"
              : "border-border text-muted hover:text-ink"
          }`}
        >
          {c.name}
        </Link>
      ))}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Company name"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={create}
            disabled={pending}
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
          >
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="px-2 text-sm text-muted"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-accent hover:text-accent transition"
        >
          + New company
        </button>
      )}
    </div>
  );
}

function EmptyCompanies() {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-surface px-4 py-12 text-center">
      <p className="font-medium">No companies yet</p>
      <p className="mt-1 text-sm text-muted">
        Create a company above to start adding people, customizing cards, and uploading data.
      </p>
    </div>
  );
}

function CompanyPanel({
  baseUrl,
  company,
  fields,
  cards,
}: {
  baseUrl: string;
  company: Company;
  fields: Field[];
  cards: Card[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(company.name);

  // Modals state
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);
  const [uploadingData, setUploadingData] = useState(false);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      {/* Company toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {renaming ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() =>
                  start(async () => {
                    await renameCompany({ id: company.id, name });
                    setRenaming(false);
                    refresh();
                  })
                }
                className="rounded-[8px] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setRenaming(false);
                  setName(company.name);
                }}
                className="text-sm text-muted"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold">{company.name}</h2>
              <button
                onClick={() => setRenaming(true)}
                className="rounded-[8px] border border-border px-2 py-1 text-xs text-muted hover:text-ink"
              >
                Rename
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AddColumn companyId={company.id} onDone={refresh} />

          {/* Upload Data button (CSV / vCard) */}
          <button
            type="button"
            onClick={() => setUploadingData(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-bg transition"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Data</span>
          </button>

          {/* Add person button (opens clean card creator modal) */}
          <button
            type="button"
            onClick={() => setCreatingCard(true)}
            className="rounded-[8px] bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-ink hover:opacity-90 transition shadow-sm"
          >
            + Add person
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-[12px] border border-border bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th className="sticky left-0 z-10 bg-bg/95 px-3 py-2 text-left font-medium">
                Person / Card
              </th>
              {fields.map((f) => (
                <ColumnHeader key={f.id} field={f} onDone={refresh} />
              ))}
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="px-3 py-12 text-center text-muted"
                >
                  <p className="font-medium text-ink">No cards in this company yet</p>
                  <p className="mt-1 text-xs text-muted">
                    Click “+ Add person” to create a card with photo avatar, or “Upload Data” to import CSV / vCard.
                  </p>
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <Row
                  key={card.id}
                  card={card}
                  fields={fields}
                  baseUrl={baseUrl}
                  onEdit={() => setEditingCard(card)}
                  onStructuralChange={refresh}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {cards.length} {cards.length === 1 ? "person" : "people"} ·{" "}
          {fields.length} columns
        </span>
        <button
          onClick={() => {
            if (confirm(`Delete company “${company.name}” and all its cards?`)) {
              start(async () => {
                await deleteCompany({ id: company.id });
                router.push("/cards");
                router.refresh();
              });
            }
          }}
          className="text-danger hover:underline"
        >
          Delete company
        </button>
      </div>

      {/* Edit Existing Card Modal */}
      {editingCard && (
        <CardEditModal
          isOpen={Boolean(editingCard)}
          onClose={() => setEditingCard(null)}
          companyId={company.id}
          companyName={company.name}
          fields={fields}
          initialCard={editingCard}
          baseUrl={baseUrl}
          onSaved={refresh}
        />
      )}

      {/* Create New Card Modal */}
      {creatingCard && (
        <CardEditModal
          isOpen={creatingCard}
          onClose={() => setCreatingCard(false)}
          companyId={company.id}
          companyName={company.name}
          fields={fields}
          initialCard={null}
          baseUrl={baseUrl}
          onSaved={refresh}
        />
      )}

      {/* Data Upload / Bulk Import Modal */}
      {uploadingData && (
        <DataUploadModal
          isOpen={uploadingData}
          onClose={() => setUploadingData(false)}
          companyId={company.id}
          companyName={company.name}
          fields={fields}
          onImported={refresh}
        />
      )}
    </div>
  );
}

function AddColumn({
  companyId,
  onDone,
}: {
  companyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(type: FieldType) {
    setError(null);
    start(async () => {
      const res = await addField({ companyId, type });
      if (res.ok) {
        setOpen(false);
        onDone();
      } else setError(res.error);
    });
  }

  function addCustom() {
    setError(null);
    start(async () => {
      const res = await addField({
        companyId,
        type: "custom",
        label,
        icon,
      });
      if (res.ok) {
        setOpen(false);
        setCustom(false);
        setLabel("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg transition"
      >
        + Add column
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-72 overflow-y-auto rounded-[12px] border border-border bg-surface p-3 shadow-lg">
          {!custom ? (
            <>
              <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
                Choose a channel
              </p>
              <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1">
                {FIELD_TYPE_ORDER.filter((t) => t !== "custom").map((t) => (
                  <button
                    key={t}
                    disabled={pending}
                    onClick={() => pick(t)}
                    className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-xs hover:bg-bg transition"
                  >
                    <span className="text-accent">
                      <FieldIcon type={t} size={14} />
                    </span>
                    <span className="truncate">{FIELD_TYPES[t].label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCustom(true)}
                className="mt-3 w-full rounded-[8px] border border-dashed border-border px-2 py-1.5 text-xs text-muted hover:border-accent hover:text-accent transition"
              >
                + Custom column
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Custom column</p>
              <div className="flex gap-2">
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 4))}
                  aria-label="Icon (emoji)"
                  className="w-12 rounded-[8px] border border-border bg-surface px-2 py-1.5 text-center text-lg outline-none focus:border-accent"
                />
                <input
                  autoFocus
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Column name"
                  className={inputCls}
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={addCustom}
                  disabled={pending || !label.trim()}
                  className="flex-1 rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => setCustom(false)}
                  className="rounded-[8px] border border-border px-3 py-1.5 text-xs"
                >
                  Back
                </button>
              </div>
            </div>
          )}
          {error && !custom && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ColumnHeader({ field, onDone }: { field: Field; onDone: () => void }) {
  const [menu, setMenu] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [icon, setIcon] = useState(field.icon ?? "");
  const [pending, start] = useTransition();
  const isCustom = field.type === "custom";

  return (
    <th className="relative min-w-[160px] px-3 py-2 text-left font-medium">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted">
          <FieldIcon type={field.type} icon={field.icon} size={16} />
        </span>
        {field.label}
        <button
          onClick={() => setMenu((v) => !v)}
          aria-label="Column options"
          className="ml-0.5 rounded px-1 text-muted hover:text-ink"
        >
          ⋯
        </button>
      </span>
      {menu && (
        <div className="absolute left-3 z-20 mt-1 w-56 rounded-[12px] border border-border bg-surface p-3 text-left font-normal shadow-lg">
          <div className="space-y-2">
            {isCustom && (
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 4))}
                aria-label="Icon"
                className="w-14 rounded-[8px] border border-border bg-surface px-2 py-1.5 text-center text-lg outline-none focus:border-accent"
              />
            )}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await updateField({
                      id: field.id,
                      label,
                      ...(isCustom ? { icon } : {}),
                    });
                    setMenu(false);
                    onDone();
                  })
                }
                className="flex-1 rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() =>
                  start(async () => {
                    await deleteField({ id: field.id });
                    setMenu(false);
                    onDone();
                  })
                }
                className="rounded-[8px] border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </th>
  );
}

function Row({
  card,
  fields,
  baseUrl,
  onEdit,
  onStructuralChange,
}: {
  card: Card;
  fields: Field[];
  baseUrl: string;
  onEdit: () => void;
  onStructuralChange: () => void;
}) {
  const [fullName, setFullName] = useState(card.fullName);
  const [values, setValues] = useState<Record<string, string>>(card.values);
  const [, start] = useTransition();
  const cardUrl = `${baseUrl}/c/${card.publicId}`;
  const avatar = card.values?._avatar || null;

  const initials = card.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  const saveName = () => {
    if (fullName !== card.fullName)
      start(() => updateCard({ id: card.id, fullName }).then(() => {}));
  };
  const saveValue = (fieldId: string, value: string) => {
    if ((card.values[fieldId] ?? "") !== value)
      start(() => setCardValue({ id: card.id, fieldId, value }).then(() => {}));
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg/30 transition">
      {/* Name and Avatar column */}
      <td className="sticky left-0 z-10 bg-surface px-3 py-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onEdit}
            title="Edit card"
            className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg text-xs font-bold text-accent transition hover:ring-2 hover:ring-accent"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              initials || "?"
            )}
          </button>
          <div className="min-w-0 flex-1">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={saveName}
              className={`${cellCls} font-medium text-ink px-1.5 py-0.5`}
            />
            {card.title && (
              <span className="block truncate px-1.5 text-[11px] text-muted">
                {card.title}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Dynamic fields */}
      {fields.map((f) => (
        <td key={f.id} className="px-2 py-1">
          <input
            value={values[f.id] ?? ""}
            placeholder={FIELD_TYPES[f.type as FieldType]?.placeholder ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.id]: e.target.value }))
            }
            onBlur={(e) => saveValue(f.id, e.target.value)}
            className={cellCls}
          />
        </td>
      ))}

      {/* Actions */}
      <td className="whitespace-nowrap px-3 py-1 text-right">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-[6px] border border-border bg-surface px-2.5 py-1 text-xs font-medium text-accent hover:border-accent hover:bg-accent/5 transition"
          >
            Edit
          </button>
          <a
            href={`/c/${card.publicId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[6px] border border-border px-2 py-1 text-xs font-medium text-muted hover:text-ink hover:bg-bg transition"
          >
            View
          </a>
          <CopyButton
            value={cardUrl}
            label="Link"
            className="px-2 py-1 text-xs"
          />
          <button
            onClick={() => {
              if (confirm(`Delete ${card.fullName}?`))
                start(() =>
                  deleteCard({ id: card.id }).then(() => onStructuralChange()),
                );
            }}
            aria-label="Delete person"
            className="rounded-[6px] border border-border px-2 py-1 text-xs text-muted hover:text-danger hover:border-danger transition"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
