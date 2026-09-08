import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const trim = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string; market?: string; sourceUrl?: string; memo?: string;
      sort?: number; active?: boolean;
    };

    const values: Record<string, unknown> = {};
    if ("name" in body) {
      const name = trim(body.name, 80);
      if (!name) throw new Error("거래처 이름을 넣어 주세요.");
      values.name = name;
    }
    if ("market" in body) values.market = trim(body.market, 80) || null;
    if ("memo" in body) values.memo = trim(body.memo, 500) || null;
    if ("sort" in body && Number.isFinite(body.sort)) values.sort = Number(body.sort);
    if ("active" in body) values.active = Boolean(body.active);
    if ("sourceUrl" in body) {
      const url = trim(body.sourceUrl, 400);
      if (url && !/^https:\/\/([a-z0-9-]+\.)*sinsangmarket\.kr\//i.test(url)) {
        throw new Error("신상마켓 주소만 넣을 수 있습니다.");
      }
      values.source_url = url || null;
    }
    if (!Object.keys(values).length) throw new Error("바꿀 내용이 없습니다.");

    const { error } = await supabaseAdmin().from("shops").update(values).eq("id", id);
    if (error) {
      if (error.code === "23505") throw new Error("이미 있는 거래처 이름입니다.");
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

/** 거래처만 지운다. 그 거래처의 상품은 그대로 둔다. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin().from("shops").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "지우지 못했습니다." },
      { status: 400 },
    );
  }
}
