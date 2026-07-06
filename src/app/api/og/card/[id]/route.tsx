import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let card:
    | { fullName: string; title: string | null; company: string | null }
    | null = null;
  try {
    const [row] = await db
      .select({
        fullName: schema.cards.fullName,
        title: schema.cards.title,
        company: schema.companies.name,
      })
      .from(schema.cards)
      .innerJoin(
        schema.companies,
        eq(schema.cards.companyId, schema.companies.id),
      )
      .where(eq(schema.cards.publicId, id))
      .limit(1);
    card = row ?? null;
  } catch {
    card = null;
  }

  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAFAF8",
            color: "#16181D",
            fontSize: 48,
          }}
        >
          Pastor
        </div>
      ),
      SIZE,
    );
  }

  const base = await getBaseUrl();
  const qr = await QRCode.toDataURL(`${base}/c/${id}`, {
    margin: 1,
    width: 340,
    color: { dark: "#16181D", light: "#FFFFFF" },
  });

  const initials = card.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FAFAF8",
        }}
      >
        <div style={{ width: 16, height: "100%", background: "#0E7C66" }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 72,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 96,
                  background: "#16181D",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  fontWeight: 700,
                }}
              >
                {initials || "?"}
              </div>
              {card.company && (
                <div style={{ fontSize: 30, color: "#0E7C66", fontWeight: 700 }}>
                  {card.company}
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: 68,
                fontWeight: 700,
                color: "#16181D",
                marginTop: 28,
                lineHeight: 1.05,
              }}
            >
              {card.fullName}
            </div>
            {card.title && (
              <div style={{ fontSize: 32, color: "#6B7280", marginTop: 12 }}>
                {card.title}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              padding: 18,
              background: "#FFFFFF",
              borderRadius: 20,
              border: "1px solid #E5E5E0",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={340} height={340} alt="" />
          </div>
        </div>
      </div>
    ),
    SIZE,
  );
}
