import { cookies } from "next/headers";

export const GATE_COOKIE = "pickroom_key";

function passphrase() {
  const value = process.env.PICKROOM_PASSPHRASE;
  if (!value || value.length < 4) {
    throw new Error("PICKROOM_PASSPHRASE 환경변수가 없습니다. Vercel 설정에 넣어 주세요.");
  }
  return value;
}

/** 암구호를 그대로 쿠키에 담지 않는다. 해시만 담고 그 값끼리 비교한다. */
export async function expectedToken(value = passphrase()) {
  const bytes = new TextEncoder().encode(`pickroom:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function sameToken(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 서버 라우트에서 부른다. 문이 열려 있지 않으면 false. */
export async function isOpen() {
  try {
    const jar = await cookies();
    const value = jar.get(GATE_COOKIE)?.value;
    if (!value) return false;
    return sameToken(value, await expectedToken());
  } catch {
    return false;
  }
}
