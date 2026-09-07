import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 60;

const ORIGIN = "https://sinsangmarket.kr";
const MAX_IMAGES = 12;
const MAX_BYTES = 8 * 1024 * 1024;

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", ORIGIN);
  response.headers.set("Access-Control-Allow-Headers", "content-type, x-pickroom-key");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

function extensionFor(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

/** 신상마켓 화면에서 모은 자료를 받는다.
 *  주소를 서버가 직접 열지 못하므로 브라우저가 찾아낸 이미지 주소를 넘겨받아
 *  여기서 내려받아 저장한다. */
export async function POST(request: Request) {
  const key = request.headers.get("x-pickroom-key") || "";
  if (!process.env.PICKROOM_PASSPHRASE || key !== process.env.PICKROOM_PASSPHRASE) {
    return cors(NextResponse.json({ error: "권한이 없습니다." }, { status: 401 }));
  }

  try {
    const body = (await request.json()) as {
      gid?: string;
      images?: string[];
      image?: { data?: string; type?: string };
      sort?: number;
      detailText?: string;
      replace?: boolean;
    };
    const gid = String(body.gid || "").trim();
    if (!gid) throw new Error("상품번호가 없습니다.");

    const admin = supabaseAdmin();
    const { data: product, error } = await admin
      .from("products").select("id").eq("gid", gid).maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) throw new Error(`픽룸에 없는 상품번호입니다: ${gid}`);

    if (body.detailText && body.detailText.trim().length > 10) {
      await admin.from("products")
        .update({ memo: body.detailText.trim().slice(0, 4000) })
        .eq("id", product.id);
    }

    const urls = (body.images || [])
      .filter((url) => typeof url === "string" && url.startsWith("https://"))
      .slice(0, MAX_IMAGES);

    if (body.replace) {
      const { data: old } = await admin
        .from("product_photos").select("id, path").eq("product_id", product.id);
      if (old?.length) {
        await admin.storage.from("photos").remove(old.map((row) => row.path));
        await admin.from("product_photos").delete().eq("product_id", product.id);
      }
    }

    // 신상마켓 이미지 서버가 외부 요청을 막는다(455). 그래서 브라우저가 받아둔
    // 바이트를 그대로 넘겨받는 길을 둔다. 한 장씩 보내 요청 크기 제한을 피한다.
    if (body.image?.data) {
      const type = body.image.type || "image/jpeg";
      if (!type.startsWith("image/")) throw new Error("이미지가 아닙니다.");
      const buffer = Buffer.from(body.image.data, "base64");
      if (buffer.byteLength > MAX_BYTES) throw new Error("사진이 너무 큽니다.");

      const sort = Number.isFinite(body.sort) ? Number(body.sort) : 1;
      const path = `${product.id}/sinsang-${Date.now()}-${sort}.${extensionFor(type)}`;
      const upload = await admin.storage.from("photos")
        .upload(path, buffer, { contentType: type, upsert: false });
      if (upload.error) throw new Error(upload.error.message);
      await admin.from("product_photos")
        .insert({ product_id: product.id, path, sort });
      return cors(NextResponse.json({ ok: true, gid, saved: 1 }));
    }

    const saved: string[] = [];
    const failed: string[] = [];

    for (let index = 0; index < urls.length; index += 1) {
      try {
        const source = await fetch(urls[index], {
          headers: { Referer: `${ORIGIN}/`, "User-Agent": "Mozilla/5.0" },
        });
        if (!source.ok) throw new Error(`${source.status}`);
        const type = source.headers.get("content-type") || "image/jpeg";
        if (!type.startsWith("image/")) throw new Error("이미지가 아님");
        const buffer = await source.arrayBuffer();
        if (buffer.byteLength > MAX_BYTES) throw new Error("너무 큼");

        const path = `${product.id}/sinsang-${Date.now()}-${index}.${extensionFor(type)}`;
        const upload = await admin.storage.from("photos")
          .upload(path, buffer, { contentType: type, upsert: false });
        if (upload.error) throw new Error(upload.error.message);

        await admin.from("product_photos")
          .insert({ product_id: product.id, path, sort: index + 1 });
        saved.push(path);
      } catch (cause) {
        failed.push(cause instanceof Error ? cause.message : "실패");
      }
    }

    return cors(NextResponse.json({ ok: true, gid, saved: saved.length, failed }));
  } catch (cause) {
    return cors(NextResponse.json(
      { error: cause instanceof Error ? cause.message : "가져오지 못했습니다." },
      { status: 400 },
    ));
  }
}
