import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SUPABASE_URL } from "@/lib/config";

const ALLOWED = ["jpg", "jpeg", "png", "webp", "gif"];

/** 사진은 브라우저에서 Supabase로 곧장 올린다.
 *  Vercel 함수의 요청 크기 제한(4.5MB)에 폰 사진이 걸리기 때문이다. */
export async function POST(request: Request) {
  try {
    const { productId, ext } = (await request.json()) as { productId?: string; ext?: string };
    if (!productId) throw new Error("상품을 찾지 못했습니다.");
    const extension = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!ALLOWED.includes(extension)) throw new Error("이미지 파일만 올릴 수 있습니다.");

    const path = `${productId}/${Date.now()}.${extension}`;
    const { data, error } = await supabaseAdmin().storage.from("photos").createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message || "올릴 주소를 만들지 못했습니다.");

    const signedUrl = data.signedUrl.startsWith("http")
      ? data.signedUrl
      : `${SUPABASE_URL}/storage/v1${data.signedUrl}`;
    return NextResponse.json({ path: data.path, signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "실패했습니다." },
      { status: 400 },
    );
  }
}
