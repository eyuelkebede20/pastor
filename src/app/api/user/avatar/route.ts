import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateAvatar } from "@/actions/profile";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let avatarUrl = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      avatarUrl = body.avatarUrl || "";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const mime = file.type || "image/jpeg";
        avatarUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      } else {
        avatarUrl = (formData.get("avatarUrl") as string) || "";
      }
    }

    const res = await updateAvatar(avatarUrl);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update avatar" },
      { status: 500 },
    );
  }
}
