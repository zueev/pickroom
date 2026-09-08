import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const trim = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("shops")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ shops: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거래처를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string; market?: string; sourceUrl?: string; memo?: string;
    };
    const name = trim(body.name, 80);
    if (name.length < 1) throw new Error("거래처 이름을 넣어 주세요.");

    const sourceUrl = trim(body.sourceUrl, 400);
    if (sourceUrl && !/^https:\/\/([a-z0-9-]+\.)*sinsangmarket\.kr\//i.test(sourceUrl)) {
      throw new Error("신상마켓 주소만 넣을 수 있습니다.");
    }

    const { data, error } = await supabaseAdmin()
      .from("shops")
      .insert({
        name,
        market: trim(body.market, 80) || null,
        source_url: sourceUrl || null,
        memo: trim(body.memo, 500) || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("이미 있는 거래처입니다.");
      throw new Error(error.message);
    }
    return NextResponse.json({ shop: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거래처를 만들지 못했습니다." },
      { status: 400 },
    );
  }
}
