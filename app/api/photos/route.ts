import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { photoUrl } from "@/lib/config";

/** 업로드가 끝난 사진을 목록에 기록한다. */
export async function POST(request: Request) {
  try {
    const { productId, path } = (await request.json()) as { productId?: string; path?: string };
    if (!productId || !path) throw new Error("사진 정보를 확인하지 못했습니다.");
    if (!path.startsWith(`${productId}/`)) throw new Error("사진 경로가 상품과 맞지 않습니다.");

    const admin = supabaseAdmin();
    const { count } = await admin
      .from("product_photos").select("id", { count: "exact", head: true }).eq("product_id", productId);

    const { data, error } = await admin
      .from("product_photos")
      .insert({ product_id: productId, path, sort: (count ?? 0) + 1 })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ photo: { ...data, url: photoUrl(data.path) } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "기록하지 못했습니다." },
      { status: 400 },
    );
  }
}
