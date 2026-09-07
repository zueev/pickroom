import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EDITABLE = ["title", "sale_price", "memo", "detail_html", "status", "colors", "sizes"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    EDITABLE.forEach((key) => {
      if (key in body) values[key] = body[key];
    });
    if (!Object.keys(values).length) {
      return NextResponse.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });
    }
    const { error } = await supabaseAdmin().from("products").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
