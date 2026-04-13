import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("rag_session")?.value;
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const decoded = Buffer.from(session, "base64").toString("utf-8");
    const [username] = decoded.split(":");
    return NextResponse.json({ username: username || "user" });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
