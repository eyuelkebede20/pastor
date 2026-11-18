"use client";

import { useId, useState, useTransition } from "react";
import { bulkAddCards } from "@/actions/cards";
import type { CardFieldDef } from "./CardEditModal";

export function DataUploadModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  fields,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  fields: CardFieldDef[];
  onImported: () => void;
}) {
  const [tab, setTab] = useState<"csv" | "vcf">("csv");
  const [parsedCards, setParsedCards] = useState<
    {
      fullName: string;
      title?: string;
      avatarUrl?: string;
      values?: Record<string, string>;
    }[]
  >([]);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const titleId = useId();

  if (!isOpen) return null;

  // ── CSV Parsing Helper ───────────────────────────────────────────────────
  function parseCsvContent(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new Error("CSV file must have a header row and at least one data row.");
    }

    // Split CSV line respecting quotes
    function splitLine(line: string): string[] {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    }

    const headers = splitLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    // Map headers to fields
    const fieldMap: Record<number, string> = {}; // colIdx -> fieldId
    let nameCol = -1;
    let titleCol = -1;
    let avatarCol = -1;

    headers.forEach((h, idx) => {
      if (h === "name" || h === "fullname" || h === "person" || h === "displayname") {
        nameCol = idx;
      } else if (h === "title" || h === "jobtitle" || h === "role" || h === "position") {
        titleCol = idx;
      } else if (h === "avatar" || h === "avatarurl" || h === "photo" || h === "image") {
        avatarCol = idx;
      } else {
        // match against company fields
        const matched = fields.find((f) => {
          const cleanLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanLabel === h || f.type === h;
        });
        if (matched) fieldMap[idx] = matched.id;
      }
    });

    if (nameCol === -1) {
      // Default to first column if no explicit name header
      nameCol = 0;
    }

    const cards: typeof parsedCards = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const fullName = cols[nameCol] || `Person ${i}`;
      const title = titleCol !== -1 ? cols[titleCol] : undefined;
      const avatarUrl = avatarCol !== -1 ? cols[avatarCol] : undefined;

      const vals: Record<string, string> = {};
      for (const [colIdx, fId] of Object.entries(fieldMap)) {
        const val = cols[Number(colIdx)];
        if (val) vals[fId] = val;
      }

      cards.push({ fullName, title, avatarUrl, values: vals });
    }

    return cards;
  }

  // ── vCard (.vcf) Parsing Helper ──────────────────────────────────────────
  function parseVcfContent(text: string) {
    const vcardBlocks = text.split(/BEGIN:VCARD/i).slice(1);
    if (vcardBlocks.length === 0) {
      throw new Error("No valid vCard (BEGIN:VCARD) blocks found in file.");
    }

    const cards: typeof parsedCards = [];

    for (const block of vcardBlocks) {
      const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      let fullName = "";
      let title = "";
      let avatarUrl = "";
      const vals: Record<string, string> = {};

      for (const line of lines) {
        if (/^FN[:;]/i.test(line)) {
          fullName = line.replace(/^FN[^:]*:/i, "").trim();
        } else if (!fullName && /^N[:;]/i.test(line)) {
          // Fallback to N: Last;First;...
          const parts = line.replace(/^N[^:]*:/i, "").split(";").filter(Boolean);
          fullName = parts.reverse().join(" ").trim();
        } else if (/^TITLE[:;]/i.test(line)) {
          title = line.replace(/^TITLE[^:]*:/i, "").trim();
        } else if (/^PHOTO[;:].*ENCODING=b/i.test(line) || /^PHOTO[;:].*BASE64/i.test(line)) {
          const rawB64 = line.replace(/^PHOTO[^:]*:/i, "").trim();
          if (rawB64) {
            avatarUrl = rawB64.startsWith("data:")
              ? rawB64
              : `data:image/jpeg;base64,${rawB64}`;
          }
        } else if (/^PHOTO[;:].*http/i.test(line)) {
          avatarUrl = line.replace(/^PHOTO[^:]*:/i, "").trim();
        } else if (/^TEL[:;]/i.test(line)) {
          const phone = line.replace(/^TEL[^:]*:/i, "").trim();
          const f = fields.find((x) => x.type === "phone");
          if (f && phone) vals[f.id] = phone;
        } else if (/^EMAIL[:;]/i.test(line)) {
          const email = line.replace(/^EMAIL[^:]*:/i, "").trim();
          const f = fields.find((x) => x.type === "email");
          if (f && email) vals[f.id] = email;
        } else if (/^URL[:;]/i.test(line)) {
          const url = line.replace(/^URL[^:]*:/i, "").trim();
          const f = fields.find((x) => x.type === "website");
          if (f && url) vals[f.id] = url;
        }
      }

      if (fullName) {
        cards.push({ fullName, title: title || undefined, avatarUrl: avatarUrl || undefined, values: vals });
      }
    }

    return cards;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setParsedCards([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);

    const reader = new FileReader();
    reader.onerror = () => setError("Could not read file.");
    reader.onload = () => {
      try {
        const text = reader.result as string;
        if (tab === "csv" || file.name.endsWith(".csv")) {
          const res = parseCsvContent(text);
          setParsedCards(res);
        } else {
          const res = parseVcfContent(text);
          setParsedCards(res);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file.");
      }
    };
    reader.readAsText(file);
  }

  function downloadCsvTemplate() {
    const headers = ["Full Name", "Title", ...fields.map((f) => f.label)];
    const sample = ["Jane Doe", "Product Director", ...fields.map((f) => f.type === "email" ? "jane@example.com" : f.type === "phone" ? "+1 555 123 4567" : "https://example.com")];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sample.join(",")].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `${companyName.toLowerCase().replace(/\s+/g, "_")}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleImport() {
    if (parsedCards.length === 0) return;
    setError(null);

    start(async () => {
      try {
        const res = await bulkAddCards({
          companyId,
          cards: parsedCards,
        });
        if (res.ok) {
          onImported();
          onClose();
        } else {
          setError(res.error);
        }
      } catch {
        setError("Failed to import cards. Please try again.");
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold">
              Import Business Cards
            </h2>
            <p className="text-xs text-muted">
              Upload CSV or vCard (.vcf) data for {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-ink transition"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-border bg-bg/40 px-5 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTab("csv");
                setParsedCards([]);
                setFilename("");
                setError(null);
              }}
              className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === "csv"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              CSV Spreadsheet
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("vcf");
                setParsedCards([]);
                setFilename("");
                setError(null);
              }}
              className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                tab === "vcf"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              vCard (.vcf)
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {tab === "csv" && (
            <div className="flex items-center justify-between rounded-[8px] bg-bg/60 p-3 border border-border">
              <div>
                <p className="text-xs font-medium text-ink">Download Sample CSV</p>
                <p className="text-[11px] text-muted">
                  Pre-configured with columns matching your company columns.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="rounded-[6px] border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent transition"
              >
                Download Template
              </button>
            </div>
          )}

          {/* File Picker */}
          <div className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border bg-bg/30 p-6 text-center hover:border-accent/60 transition">
            <svg
              viewBox="0 0 24 24"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted mb-2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <p className="text-sm font-semibold text-ink">
              {filename || (tab === "csv" ? "Select or drag a CSV file" : "Select or drag a .vcf file")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {tab === "csv"
                ? "Accepts comma-separated .csv files"
                : "Accepts single or multi-person vCard .vcf files"}
            </p>
            <label className="mt-3 inline-block cursor-pointer rounded-[8px] bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:opacity-90 transition">
              Choose File
              <input
                type="file"
                accept={tab === "csv" ? ".csv,text/csv" : ".vcf,text/vcard"}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          {/* Preview Parsed Cards */}
          {parsedCards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Ready to Import ({parsedCards.length}{" "}
                  {parsedCards.length === 1 ? "card" : "cards"})
                </h4>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-[8px] border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Name</th>
                      <th className="px-3 py-1.5 font-medium">Title</th>
                      <th className="px-3 py-1.5 font-medium">Channels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedCards.map((c, i) => (
                      <tr key={i} className="hover:bg-bg/40">
                        <td className="px-3 py-1.5 font-medium text-ink">
                          {c.fullName}
                        </td>
                        <td className="px-3 py-1.5 text-muted">
                          {c.title || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-muted">
                          {c.values ? Object.keys(c.values).length : 0} fields
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-bg/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-border px-4 py-2 text-sm font-medium hover:bg-bg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedCards.length === 0 || pending}
            className="rounded-[8px] bg-accent px-5 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-40 transition"
          >
            {pending ? "Importing…" : `Import ${parsedCards.length} Cards`}
          </button>
        </div>
      </div>
    </div>
  );
}
