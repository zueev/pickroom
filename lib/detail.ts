export type Product = {
  id: string;
  gid: string;
  title: string;
  source_url: string | null;
  vendor: string | null;
  wholesale_price: number;
  sale_price: number | null;
  colors: string | null;
  sizes: string | null;
  material: string | null;
  origin: string | null;
  single_buy: boolean | null;
  memo: string | null;
  reel_idea: string | null;
  detail_html: string | null;
  cafe24_product_no: string | null;
  status: "draft" | "ready" | "registered";
};

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const list = (v: string | null) =>
  (v || "").split(/[\/,·]/).map((x) => x.trim()).filter(Boolean);

/** 상품명에서 도매 사이트용 표기를 걷어내고 쇼핑몰에 쓸 이름으로 만든다. */
export function cleanTitle(raw: string) {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/26\s?[FfSs][WwSs]\)?/g, " ")
    .replace(/주문\s?폭주|당일출고|낱장가능|낱장 가능|가을신상|신상\)/g, " ")
    .replace(/[)\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** 실착 사진과 상품 자료로 카페24 상세페이지 HTML을 만든다. */
export function buildDetailHtml(product: Product, photoUrls: string[]) {
  const name = cleanTitle(product.title) || product.title;
  const colors = list(product.colors);
  const sizes = list(product.sizes);

  const photos = photoUrls
    .map((url) => `<img src="${esc(url)}" alt="${esc(name)} 실착 사진" style="display:block;width:100%;max-width:860px;margin:0 auto 12px;border-radius:8px">`)
    .join("");

  const memo = (product.memo || "").trim();
  const memoBlock = memo
    ? `<p style="font-size:16px;line-height:1.9;color:#333;margin:0 0 28px;white-space:pre-wrap">${esc(memo)}</p>`
    : "";

  const row = (label: string, value: string) =>
    `<tr><th style="width:110px;text-align:left;padding:10px 0;color:#888;font-weight:500;vertical-align:top">${esc(label)}</th><td style="padding:10px 0;color:#222">${esc(value)}</td></tr>`;

  const info = [
    colors.length ? row("컬러", colors.join(", ")) : "",
    sizes.length ? row("사이즈", sizes.join(", ")) : "",
    product.material ? row("소재", product.material) : "",
    product.origin ? row("제조국", product.origin) : "",
  ].join("");

  return `<section style="max-width:860px;margin:0 auto;padding:0 4px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111;line-height:1.7">
<h1 style="font-size:26px;line-height:1.4;margin:0 0 6px;font-weight:700">${esc(name)}</h1>
<p style="font-size:14px;color:#999;margin:0 0 28px">직접 입어보고 촬영했습니다</p>
${photos}
${memoBlock}
<table style="width:100%;border-collapse:collapse;font-size:15px;margin:32px 0 0;border-top:1px solid #eee">${info}</table>
<p style="font-size:13px;color:#999;margin:28px 0 0;line-height:1.8">모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.<br>첫 세탁은 단독으로, 찬물에서 해주세요.</p>
</section>`;
}
