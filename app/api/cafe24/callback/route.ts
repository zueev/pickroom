import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadConnection } from "@/lib/cafe24";
import { appOrigin } from "@/lib/config";

const fail = (message: string) =>
  NextResponse.redirect(`${appOrigin()}/?cafe24=error&detail=${encodeURIComponent(message)}`);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail("카페24가 인증 코드를 보내지 않았습니다.");

  try {
    const connection = await loadConnection();
    if (!connection) return fail("카페24 앱 정보가 저장되어 있지 않습니다.");
    if (state !== connection.oauth_state) return fail("인증 요청이 일치하지 않습니다. 다시 연결해 주세요.");
    const started = connection.oauth_state_at ? Date.parse(connection.oauth_state_at) : 0;
    if (!started || Date.now() - started > 600_000) return fail("인증 요청이 만료됐습니다. 다시 연결해 주세요.");

    const response = await fetch(`https://${connection.mall_id}.cafe24api.com/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${connection.client_id}:${connection.client_secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appOrigin()}/api/cafe24/callback`,
      }),
    });
    const token = (await response.json()) as {
      access_token?: string; refresh_token?: string; expires_at?: string; error_description?: string;
    };
    if (!response.ok || !token.access_token || !token.refresh_token) {
      return fail(token.error_description || "카페24 인증 토큰 발급에 실패했습니다.");
    }

    await supabaseAdmin().from("cafe24_connection").update({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: token.expires_at ?? null,
      oauth_state: null,
      oauth_state_at: null,
      connected_at: new Date().toISOString(),
    }).eq("id", "primary");

    return NextResponse.redirect(`${appOrigin()}/?cafe24=connected`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "카페24 연결에 실패했습니다.");
  }
}
