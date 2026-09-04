import { supabaseAdmin } from "./supabase-admin";

export type Cafe24Connection = {
  id: string;
  mall_id: string;
  client_id: string;
  client_secret: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  oauth_state: string | null;
  oauth_state_at: string | null;
  connected_at: string | null;
};

export const CAFE24_SCOPE = "mall.read_product,mall.write_product";

export async function loadConnection() {
  const { data, error } = await supabaseAdmin()
    .from("cafe24_connection")
    .select("*")
    .eq("id", "primary")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Cafe24Connection | null) ?? null;
}

function basic(clientId: string, secret: string) {
  return Buffer.from(`${clientId}:${secret}`).toString("base64");
}

async function refresh(connection: Cafe24Connection) {
  if (!connection.refresh_token) throw new Error("카페24 재로그인이 필요합니다.");
  const response = await fetch(`https://${connection.mall_id}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic(connection.client_id, connection.client_secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refresh_token }),
  });
  const token = (await response.json()) as {
    access_token?: string; refresh_token?: string; expires_at?: string; error_description?: string;
  };
  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description || "카페24 토큰 갱신에 실패했습니다. 다시 연결해 주세요.");
  }
  await supabaseAdmin().from("cafe24_connection").update({
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? connection.refresh_token,
    token_expires_at: token.expires_at ?? null,
  }).eq("id", "primary");
  return { ...connection, access_token: token.access_token, refresh_token: token.refresh_token ?? connection.refresh_token };
}

/** 카페24 API 호출. 401이면 한 번만 토큰을 갱신하고 다시 시도한다. */
export async function cafe24Fetch(
  connection: Cafe24Connection,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  let active = connection;
  if (!active.access_token) active = await refresh(active);

  const call = async (conn: Cafe24Connection) =>
    fetch(`https://${conn.mall_id}.cafe24api.com${path}`, {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2025-06-01",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

  let response = await call(active);
  if (response.status === 401) {
    active = await refresh(active);
    response = await call(active);
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (payload?.error?.details ? JSON.stringify(payload.error.details) : "") ||
      `카페24 요청이 실패했습니다 (${response.status})`;
    throw new Error(message);
  }
  return payload;
}
