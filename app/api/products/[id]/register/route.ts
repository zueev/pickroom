import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cafe24Fetch, loadConnection } from "@/lib/cafe24";
import { buildDetailHtml, cleanTitle, type Product } from "@/lib/detail";

const PHOTO_TTL = 60 * 60;

function madeInCode(origin: string | null) {
  if (!origin) return "KR";
  if (/대한민국|국내|한국/.test(origin)) return "KR";
  if (/중국/.test(origin)) return "CN";
  if (/베트남/.test(origin)) return "VN";
  return "KR";
}

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

function options(product: Product) {
  const colors = (product.colors || "").split(/[\/,·]/).map((v) => v.trim()).filter(Boolean);
  const sizes = (product.sizes || "").split(/[\/,·]/).map((v) => v.trim()).filter(Boolean);
  const set: Array<{ name: string; value: string[] }> = [];
  if (colors.length) set.push({ name: "색상", value: colors.slice(0, 100).map((v) => v.slice(0, 100)) });
  if (sizes.length) set.push({ name: "사이즈", value: sizes.slice(0, 100).map((v) => v.slice(0, 100)) });
  return set;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwner())) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const { id } = await params;
  const admin = supabaseAdmin();

  try {
    const { data: product, error } = await admin.from("products").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) return NextResponse.json({ error: "상품을 찾지 못했습니다." }, { status: 404 });
    if (product.cafe24_product_no) {
      return NextResponse.json({ error: "이미 등록된 상품입니다." }, { status: 409 });
    }

    const connection = await loadConnection();
    if (!connection?.connected_at || !connection.access_token) {
      return NextResponse.json({ error: "카페24 연결을 먼저 완료해 주세요." }, { status: 400 });
    }

    const salePrice = Number(product.sale_price);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return NextResponse.json({ error: "판매가를 먼저 입력해 주세요." }, { status: 400 });
    }

    const { data: photos } = await admin
      .from("product_photos").select("path").eq("product_id", id).order("sort");
    if (!photos?.length) {
      return NextResponse.json({ error: "실착 사진을 한 장 이상 올려 주세요." }, { status: 400 });
    }

    const signed = await Promise.all(
      photos.map(async (photo: { path: string }) => {
        const { data } = await admin.storage.from("photos").createSignedUrl(photo.path, PHOTO_TTL);
        return data?.signedUrl ?? "";
      }),
    );
    const photoUrls = signed.filter(Boolean);
    if (!photoUrls.length) throw new Error("실착 사진 주소를 만들지 못했습니다.");

    const detailHtml = product.detail_html?.trim() || buildDetailHtml(product as Product, photoUrls);
    const name = cleanTitle(product.title) || product.title;
    const set = options(product as Product);

    const payload = {
      shop_no: 1,
      request: {
        display: "F",
        selling: "F",
        product_condition: "N",
        product_name: name.slice(0, 100),
        supply_price: String(product.wholesale_price),
        price: String(salePrice),
        retail_price: String(salePrice),
        description: detailHtml,
        made_in_code: madeInCode(product.origin),
        shipping_scope: "A",
        shipping_method: "01",
        shipping_fee_by_product: "T",
        shipping_fee_type: "T",
        ...(set.length ? { has_option: "T", options: set } : { has_option: "F" }),
      },
    };

    const created = await cafe24Fetch(connection, "/api/v2/admin/products", { method: "POST", body: payload });
    const productNo = created?.product?.product_no;
    if (!productNo) throw new Error("카페24가 상품번호를 돌려주지 않았습니다.");

    const warnings: string[] = [];
    try {
      const source = await fetch(photoUrls[0]);
      if (!source.ok) throw new Error("사진을 읽지 못했습니다.");
      const buffer = await source.arrayBuffer();
      if (buffer.byteLength > 10 * 1024 * 1024) throw new Error("대표이미지가 10MB를 넘습니다.");
      const type = source.headers.get("content-type") || "image/jpeg";
      await cafe24Fetch(connection, `/api/v2/admin/products/${productNo}/images`, {
        method: "POST",
        body: {
          shop_no: 1,
          request: { image_upload_type: "A", detail_image: `data:${type};base64,${toBase64(buffer)}` },
        },
      });
    } catch (cause) {
      warnings.push(
        cause instanceof Error
          ? `상품은 등록됐지만 대표이미지 연결에 실패했습니다: ${cause.message}`
          : "대표이미지 연결에 실패했습니다.",
      );
    }

    await admin.from("products").update({
      cafe24_product_no: String(productNo),
      detail_html: detailHtml,
      status: "registered",
    }).eq("id", id);

    return NextResponse.json({
      ok: true,
      productNo: String(productNo),
      warnings,
      note: "진열 안 함 · 판매 안 함 상태로 올라갔습니다. 카페24에서 확인한 뒤 판매를 시작하세요.",
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "카페24 등록에 실패했습니다." },
      { status: 400 },
    );
  }
}
