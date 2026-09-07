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

export const listOf = (v: string | null) =>
  (v || "").split(/[\/,·]/).map((x) => x.trim()).filter(Boolean);

/**
 * 도매 사이트용 표기를 걷어내고 쇼핑몰에 쓸 이름으로 만든다.
 * "BEST)글로시 포켓 팬츠" → "글로시 포켓 팬츠"
 */
const MARKERS =
  "(?:best|new|sale|신상|인기신상|주문폭주|주문대폭주|재진행|기획|가을신상|여름신상|초가을신상|겨울신상|봄신상|실시간폭주|당일출고|반응폭주|인기재진행)";

export function cleanTitle(raw: string) {
  let name = raw.replace(/\s+/g, " ").trim();

  // "BEST)", "가을신상))", "재진행 반응폭주)" 처럼 앞에 붙어 닫는 괄호로 끝나는 문구
  name = name.replace(new RegExp(`^(?:\\s*${MARKERS}[^()\\[\\]]{0,14}?\\)+)+\\s*`, "i"), "");
  // "26fw)", "25FW)" 같은 시즌 표기
  name = name.replace(/^\s*(?:20)?\d{2}\s?[FfSs][WwSs]\s*\)*\s*/, "");

  // 맨 앞과 맨 뒤의 괄호 묶음은 검색 키워드라 상품명에 필요 없다
  for (let i = 0; i < 4; i += 1) {
    const next = name
      .replace(/^\s*\([^)]*\)\s*/, "")
      .replace(/^\s*\[[^\]]*\]\s*/, "")
      .replace(/\s*\([^()]*\)\s*$/, "")
      .replace(/\s*\[[^\][]*\]\s*$/, "");
    if (next === name) break;
    name = next;
  }

  name = name.replace(/[)\]]/g, " ").replace(/\s+/g, " ").trim();

  // 다 걷어내서 남는 게 없으면 원래 이름을 쓴다
  if (name.length < 2) name = raw.replace(/\s+/g, " ").trim();
  return name.slice(0, 100);
}

/** 있는 사실만으로 한 줄 소개를 만든다. 없는 말은 짓지 않는다. */
function intro(product: Product) {
  const parts: string[] = [];
  const colors = listOf(product.colors);
  const sizes = listOf(product.sizes);

  if (product.material) parts.push(`${product.material} 소재`);
  if (colors.length >= 2) parts.push(`${colors.length}가지 색상`);
  else if (colors.length === 1) parts.push(`${colors[0]} 한 가지 색상`);
  if (sizes.length >= 2) parts.push(`${sizes.join("·")} 사이즈`);
  else if (sizes.length === 1 && /free/i.test(sizes[0])) parts.push("프리사이즈");

  return parts.join(" · ");
}

/** 실착 사진과 상품 자료로 카페24 상세페이지 HTML을 만든다. */
export function buildDetailHtml(product: Product, photoUrls: string[]) {
  const name = cleanTitle(product.title) || product.title;
  const colors = listOf(product.colors);
  const sizes = listOf(product.sizes);
  const line = intro(product);
  const [cover, ...rest] = photoUrls;

  const wrap = (inner: string) =>
    `<div style="max-width:860px;margin:0 auto;padding:0 4px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1a1a1a;line-height:1.7;-webkit-text-size-adjust:100%">${inner}</div>`;

  const photo = (url: string, alt: string) =>
    `<img src="${esc(url)}" alt="${esc(alt)}" style="display:block;width:100%;max-width:860px;margin:0 auto 10px;border-radius:6px">`;

  const chip = (text: string) =>
    `<span style="display:inline-block;border:1px solid #ddd;border-radius:999px;padding:6px 14px;margin:0 6px 8px 0;font-size:14px;color:#444">${esc(text)}</span>`;

  const row = (label: string, value: string) =>
    `<tr><th style="width:96px;text-align:left;padding:12px 0;color:#999;font-weight:400;vertical-align:top;border-bottom:1px solid #f0f0f0">${esc(label)}</th>` +
    `<td style="padding:12px 0;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${esc(value)}</td></tr>`;

  const head =
    `<div style="text-align:center;padding:8px 0 26px">` +
    `<h1 style="font-size:24px;line-height:1.4;margin:0 0 8px;font-weight:700;letter-spacing:-0.02em">${esc(name)}</h1>` +
    (line ? `<p style="font-size:15px;color:#888;margin:0">${esc(line)}</p>` : "") +
    `</div>`;

  const options =
    colors.length || sizes.length
      ? `<div style="padding:26px 0 6px;text-align:center">` +
        (colors.length
          ? `<p style="font-size:13px;color:#aaa;margin:0 0 10px;letter-spacing:0.08em">COLOR</p>${colors.map(chip).join("")}`
          : "") +
        (sizes.length
          ? `<p style="font-size:13px;color:#aaa;margin:20px 0 10px;letter-spacing:0.08em">SIZE</p>${sizes.map(chip).join("")}`
          : "") +
        `</div>`
      : "";

  const memo = (product.memo || "").trim();
  const memoBlock = memo
    ? `<div style="margin:30px 0;padding:22px;background:#fafafa;border-radius:10px">` +
      `<p style="font-size:13px;color:#aaa;margin:0 0 10px;letter-spacing:0.08em">입어보니</p>` +
      `<p style="font-size:15px;line-height:1.9;margin:0;white-space:pre-wrap">${esc(memo)}</p></div>`
    : "";

  const info = [
    colors.length ? row("컬러", colors.join(", ")) : "",
    sizes.length ? row("사이즈", sizes.join(", ")) : "",
    product.material ? row("소재", product.material) : "",
    product.origin ? row("제조국", product.origin) : "",
  ].join("");

  const table = info
    ? `<div style="margin:36px 0 0"><p style="font-size:13px;color:#aaa;margin:0 0 4px;letter-spacing:0.08em">PRODUCT INFO</p>` +
      `<table style="width:100%;border-collapse:collapse;font-size:15px">${info}</table></div>`
    : "";

  const notice =
    `<div style="margin:34px 0 10px;padding-top:24px;border-top:1px solid #eee">` +
    `<p style="font-size:13px;color:#999;line-height:1.9;margin:0">` +
    `모니터 환경에 따라 실제 색상과 차이가 있을 수 있습니다.<br>` +
    `첫 세탁은 단독으로, 찬물에서 해주세요.<br>` +
    `제품 특성상 1~3cm의 측정 오차가 있을 수 있습니다.` +
    `</p></div>`;

  return wrap(
    (cover ? photo(cover, name) : "") +
      head +
      options +
      memoBlock +
      rest.map((url, i) => photo(url, `${name} ${i + 2}`)).join("") +
      table +
      notice,
  );
}
