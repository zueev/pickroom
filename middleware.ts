import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, expectedToken, sameToken } from "./lib/gate";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const open = path.startsWith("/gate") || path.startsWith("/api/gate");
  if (open) return NextResponse.next();

  let allowed = false;
  try {
    const value = request.cookies.get(GATE_COOKIE)?.value;
    if (value) allowed = sameToken(value, await expectedToken());
  } catch {
    allowed = false;
  }

  if (allowed) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "암구호가 필요합니다." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
