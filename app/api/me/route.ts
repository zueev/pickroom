import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

/** 로그인한 사람이 이 작업실의 주인인지 알려준다.
 *  주인이 아니면 상품이 하나도 안 보이는데, 그 이유를 화면이 설명할 수 있어야 한다. */
export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase() ?? null;
  if (!email) return NextResponse.json({ email: null, owner: false });

  const { data: owner } = await supabase
    .from("app_owner").select("email").eq("email", email).maybeSingle();
  return NextResponse.json({ email, owner: Boolean(owner) });
}
