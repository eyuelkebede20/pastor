import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "@/lib/base-url";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  let profile: { displayName: string; username: string; bio: string | null } | null =
    null;
  try {
    const [row] = await db
      .select({
        displayName: schema.profiles.displayName,
        username: schema.profiles.username,
        bio: schema.profiles.bio,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.username, username.toLowerCase()))
      .limit(1);
    profile = row ?? null;
  } catch {
    profile = null;
  }

  if (!profile) {
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
  const profileUrl = `${base}/u/${profile.username}`;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    margin: 1,
    width: 380,
    color: { dark: "#16181D", light: "#FFFFFF" },
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FAFAF8",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 620,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "#0E7C66",
                boxShadow: "inset 0 0 0 6px #FAFAF8, inset 0 0 0 9px #0E7C66",
              }}
            />
            <div style={{ fontSize: 28, color: "#0E7C66", fontWeight: 700 }}>
              Pastor
            </div>
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
            {profile.displayName}
          </div>
          <div style={{ fontSize: 32, color: "#6B7280", marginTop: 12 }}>
            @{profile.username}
          </div>
          {profile.bio && (
            <div style={{ fontSize: 28, color: "#6B7280", marginTop: 20 }}>
              {profile.bio.slice(0, 100)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            padding: 20,
            background: "#FFFFFF",
            borderRadius: 24,
            border: "1px solid #E5E5E0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} width={380} height={380} alt="" />
        </div>
      </div>
    ),
    SIZE,
  );
}
