import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();
    const { data: photo, error } = await admin
      .from("product_photos").select("path").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!photo) return NextResponse.json({ ok: true });

    await admin.storage.from("photos").remove([photo.path]);
    const removed = await admin.from("product_photos").delete().eq("id", id);
    if (removed.error) throw new Error(removed.error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "지우지 못했습니다." },
      { status: 400 },
    );
  }
}
