import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/** 카페24 토큰처럼 브라우저가 절대 봐서는 안 되는 자료만 다룬다. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. Vercel 설정에 넣어 주세요.");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
