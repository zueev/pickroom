import { NextResponse } from "next/server";
import { GATE_COOKIE, expectedToken, sameToken } from "@/lib/gate";

const YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  try {
    const { pass } = (await request.json()) as { pass?: string };
    const given = (pass || "").trim();
    if (!given) return NextResponse.json({ error: "암구호를 입력해 주세요." }, { status: 400 });

    const expected = await expectedToken();
    const offered = await expectedToken(given);
    if (!sameToken(offered, expected)) {
      return NextResponse.json({ error: "암구호가 맞지 않습니다." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(GATE_COOKIE, expected, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: YEAR,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "확인하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
