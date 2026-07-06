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
  addCard,
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
          Manage a grid of people per company and hand each one a scannable
          virtual ID.
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
          className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
            c.id === selectedId
              ? "border-accent bg-accent/10 text-accent"
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
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
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
        Create a company above to start adding people and columns.
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

  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      {/* Company toolbar */}
      <div className="flex flex-wrap items-center gap-2">
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

        <div className="ml-auto flex items-center gap-2">
          <AddColumn companyId={company.id} onDone={refresh} />
          <button
            onClick={() =>
              start(async () => {
                await addCard({ companyId: company.id });
                refresh();
              })
            }
            disabled={pending}
            className="rounded-[8px] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40"
          >
            + Add person
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-[12px] border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/60">
              <th className="sticky left-0 z-10 bg-bg/60 px-3 py-2 text-left font-medium">
                Name
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
                  className="px-3 py-10 text-center text-muted"
                >
                  No people yet. Use “+ Add person”.
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <Row
                  key={card.id}
                  card={card}
                  fields={fields}
                  baseUrl={baseUrl}
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
        className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg"
      >
        + Add column
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-[12px] border border-border bg-surface p-3 shadow-sm">
          {!custom ? (
            <>
              <p className="mb-2 text-xs font-medium text-muted">Choose a type</p>
              <div className="grid grid-cols-2 gap-1">
                {FIELD_TYPE_ORDER.filter((t) => t !== "custom").map((t) => (
                  <button
                    key={t}
                    disabled={pending}
                    onClick={() => pick(t)}
                    className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-bg"
                  >
                    <span className="text-accent">
                      <FieldIcon type={t} />
                    </span>
                    {FIELD_TYPES[t].label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCustom(true)}
                className="mt-2 w-full rounded-[8px] border border-dashed border-border px-2 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
              >
                + Custom column
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted">Custom column</p>
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
                  className="flex-1 rounded-[8px] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => setCustom(false)}
                  className="rounded-[8px] border border-border px-3 py-1.5 text-sm"
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
        <div className="absolute left-3 z-20 mt-1 w-56 rounded-[12px] border border-border bg-surface p-3 text-left font-normal shadow-sm">
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
                className="flex-1 rounded-[8px] bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-40"
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
                className="rounded-[8px] border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/5"
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
  onStructuralChange,
}: {
  card: Card;
  fields: Field[];
  baseUrl: string;
  onStructuralChange: () => void;
}) {
  const [fullName, setFullName] = useState(card.fullName);
  const [values, setValues] = useState<Record<string, string>>(card.values);
  const [, start] = useTransition();
  const cardUrl = `${baseUrl}/c/${card.publicId}`;

  const saveName = () => {
    if (fullName !== card.fullName)
      start(() => updateCard({ id: card.id, fullName }).then(() => {}));
  };
  const saveValue = (fieldId: string, value: string) => {
    if ((card.values[fieldId] ?? "") !== value)
      start(() => setCardValue({ id: card.id, fieldId, value }).then(() => {}));
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="sticky left-0 z-10 bg-surface px-2 py-1">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={saveName}
          className={`${cellCls} font-medium`}
        />
      </td>
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
      <td className="whitespace-nowrap px-3 py-1 text-right">
        <div className="inline-flex items-center gap-1">
          <a
            href={`/api/card/${card.publicId}/qr.svg`}
            download={`${card.fullName || "card"}.svg`}
            className="rounded-[8px] border border-border px-2 py-1 text-xs font-medium hover:bg-bg"
          >
            SVG
          </a>
          <a
            href={`/c/${card.publicId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[8px] border border-border px-2 py-1 text-xs font-medium hover:bg-bg"
          >
            Open
          </a>
          <CopyButton
            value={cardUrl}
            label="Copy"
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
            className="rounded-[8px] border border-border px-2 py-1 text-xs text-muted hover:text-danger"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
