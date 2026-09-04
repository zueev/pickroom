import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서의 호출. 미들웨어가 쿠키를 갱신하므로 무시해도 된다.
        }
      },
    },
  });
}

/** 로그인한 사용자가 이 앱의 주인인지 확인한다. 아니면 null. */
export async function requireOwner() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: owner } = await supabase.from("app_owner").select("email").eq("email", email).maybeSingle();
  return owner ? { email } : null;
}
