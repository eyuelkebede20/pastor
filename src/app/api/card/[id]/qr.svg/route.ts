import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [card] = await db
      .select({ publicId: schema.cards.publicId })
      .from(schema.cards)
      .where(eq(schema.cards.publicId, id))
      .limit(1);
    if (!card) return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Unavailable", { status: 503 });
  }

  const base = await getBaseUrl();
  const svg = await QRCode.toString(`${base}/c/${id}`, {
    type: "svg",
    margin: 1,
    color: { dark: "#16181D", light: "#FFFFFF" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
