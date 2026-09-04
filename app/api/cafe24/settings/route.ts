import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadConnection } from "@/lib/cafe24";

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const connection = await loadConnection();
    return NextResponse.json({
      configured: Boolean(connection),
      connected: Boolean(connection?.connected_at && connection.access_token),
      mallId: connection?.mall_id ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "확인 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireOwner())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  try {
    const body = (await request.json()) as { mallId?: string; clientId?: string; clientSecret?: string };
    const mallId = (body.mallId || "").trim().toLowerCase();
    const clientId = (body.clientId || "").trim();
    const clientSecret = (body.clientSecret || "").trim();
    if (!/^[a-z0-9_-]{2,60}$/.test(mallId)) throw new Error("쇼핑몰 아이디를 확인해 주세요.");
    if (!clientId || !clientSecret) throw new Error("Client ID와 Client Secret을 모두 입력해 주세요.");

    const { error } = await supabaseAdmin().from("cafe24_connection").upsert({
      id: "primary",
      mall_id: mallId,
      client_id: clientId,
      client_secret: clientSecret,
      access_token: null,
      refresh_token: null,
      connected_at: null,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "저장 실패" }, { status: 400 });
  }
}
