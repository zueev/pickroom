import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { photoUrl } from "@/lib/config";

export async function GET() {
  try {
    const admin = supabaseAdmin();
    const [products, photos] = await Promise.all([
      admin.from("products").select("*").order("created_at", { ascending: false }),
      admin.from("product_photos").select("*").order("sort"),
    ]);
    if (products.error) throw new Error(products.error.message);
    if (photos.error) throw new Error(photos.error.message);

    return NextResponse.json({
      products: products.data ?? [],
      photos: (photos.data ?? []).map((photo) => ({ ...photo, url: photoUrl(photo.path) })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
