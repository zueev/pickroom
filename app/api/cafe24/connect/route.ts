import { NextResponse } from "next/server";
import { isOpen } from "@/lib/gate";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CAFE24_SCOPE, loadConnection } from "@/lib/cafe24";
import { appOrigin } from "@/lib/config";

export async function GET() {
  if (!(await isOpen())) return NextResponse.redirect(`${appOrigin()}/login`);
  const connection = await loadConnection();
  if (!connection) return NextResponse.redirect(`${appOrigin()}/?cafe24=not-configured`);

  const state = crypto.randomUUID();
  await supabaseAdmin()
    .from("cafe24_connection")
    .update({ oauth_state: state, oauth_state_at: new Date().toISOString() })
    .eq("id", "primary");

  const authorize = new URL(`https://${connection.mall_id}.cafe24api.com/api/v2/oauth/authorize`);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: connection.client_id,
    state,
    redirect_uri: `${appOrigin()}/api/cafe24/callback`,
    scope: CAFE24_SCOPE,
  }).toString();
  return NextResponse.redirect(authorize.toString());
}
