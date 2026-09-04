// Supabase 공개 설정. publishable 키는 브라우저에 실려 나가는 값이라 저장소에 두어도 된다.
// 비밀키(SUPABASE_SERVICE_ROLE_KEY)만 Vercel 환경변수로 받는다.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vfqywyasvowznzverkzl.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_CmOOz8DzxglBrg5VhBShPg_mZPHCpWx";

export function appOrigin() {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
