"use client";

import { useCallback, useEffect, useState } from "react";
import { buildDetailHtml, cleanTitle, type Product } from "@/lib/detail";

type Photo = { id: string; product_id: string; path: string; sort: number; url?: string };
type Cafe24State = { configured: boolean; connected: boolean; mallId: string | null };

const won = new Intl.NumberFormat("ko-KR");
const STEPS = ["상품 고르기", "실착 사진과 문구", "카페24로 보내기"];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [cafe24, setCafe24] = useState<Cafe24State>({ configured: false, connected: false, mallId: null });
  const [form, setForm] = useState({ mallId: "", clientId: "", clientSecret: "" });
  const [preview, setPreview] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const chosen = products.filter((p) => selected.includes(p.id));
  const current = products.find((p) => p.id === activeId) || chosen[0] || products[0];

  /* ---------- 자료 읽기 ---------- */

  const load = useCallback(async () => {
    setLoadFailed(false);
    // 배포 직후 첫 요청이 한 번 튕기는 일이 있다. 조용히 비어 보이지 않도록
    // 두 번까지 다시 시도하고, 그래도 실패하면 다시 불러올 수 있게 둔다.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/products");
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          setProducts(body.products as Product[]);
          const grouped: Record<string, Photo[]> = {};
          (body.photos as Photo[]).forEach((photo) => {
            grouped[photo.product_id] = [...(grouped[photo.product_id] || []), photo];
          });
          setPhotos(grouped);
          setLoaded(true);
          return;
        }
        if (attempt === 2) setNotice(body.error || "상품을 불러오지 못했습니다.");
      } catch {
        if (attempt === 2) setNotice("상품을 불러오지 못했습니다.");
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    setLoadFailed(true);
    setLoaded(true);
  }, []);

  /* ---------- 상품 수정 ---------- */

  async function patch(id: string, values: Partial<Product>) {
    setProducts((rows) => rows.map((row) => (row.id === id ? { ...row, ...values } : row)));
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setNotice(body.error || "저장하지 못했습니다.");
    }
  }

  async function upload(file: File | undefined, productId: string) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setNotice("이미지 파일을 선택해 주세요.");
    if (file.size > 10 * 1024 * 1024) return setNotice("10MB 이하 이미지를 선택해 주세요.");

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const signed = await fetch("/api/photos/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ext }),
      }).then((r) => r.json());
      if (signed.error) throw new Error(signed.error);

      const put = await fetch(signed.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("사진을 올리지 못했습니다.");

      const saved = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, path: signed.path }),
      }).then((r) => r.json());
      if (saved.error) throw new Error(saved.error);

      await load();
      setNotice("실착 사진을 올렸습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "사진을 올리지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: Photo) {
    setBusy(true);
    await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
    await load();
    setBusy(false);
  }

  function makePreview(product: Product) {
    const urls = (photos[product.id] || []).map((photo) => photo.url).filter(Boolean) as string[];
    const html = buildDetailHtml(product, urls);
    setPreview(html);
    patch(product.id, { detail_html: html, status: urls.length ? "ready" : "draft" });
  }

  /* ---------- 카페24 ---------- */

  async function saveCafe24(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/cafe24/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    setBusy(false);
    if (body.error) return setNotice(body.error);
    setCafe24({ configured: true, connected: false, mallId: form.mallId });
    setForm((f) => ({ ...f, clientSecret: "" }));
    setNotice("저장했습니다. 이어서 ‘카페24 로그인’을 눌러 주세요.");
  }

  async function register(product: Product) {
    setBusy(true);
    const response = await fetch(`/api/products/${product.id}/register`, { method: "POST" });
    const body = await response.json();
    setBusy(false);
    if (body.error) return setNotice(body.error);
    setNotice(`카페24에 올렸습니다. 상품번호 ${body.productNo}. ${body.note}`);
    if (body.warnings?.length) setNotice(body.warnings.join(" "));
    load();
  }

  async function signOut() {
    await fetch("/api/gate", { method: "DELETE" });
    window.location.href = "/gate";
  }

  /* ---------- 화면 ---------- */

  const activePhotos = current ? photos[current.id] || [] : [];

  return (
    <div className="shell">
      <header>
        <a className="logo" href="/">pickroom<span>●</span></a>
        <span className="header-label">입어보고, 찍고, 올린다.</span>
        <button className="connection" onClick={() => setDialog(true)}>
          <span className="dot" /> {cafe24.connected ? "카페24 연결됨" : "설정"}
        </button>
      </header>

      <main>
        <div className="topline">
          <span className="eyebrow">MY PRODUCT WORKSPACE</span>
          <span className="testbadge">{products.length}벌</span>
        </div>

        <div className="title-row">
          <div>
            <h1>입어본 옷만 올린다.</h1>
            <p>신상마켓에서 가져온 옷에 실착 사진을 붙여 카페24로 보냅니다.</p>
          </div>
        </div>

        <nav className="steps" aria-label="등록 단계">
          {STEPS.map((label, index) => (
            <button
              key={label}
              className={step === index ? "active" : ""}
              onClick={() => {
                if (index > 0 && !selected.length) return setNotice("먼저 옷을 골라 주세요.");
                if (index > 0 && !activeId) setActiveId(chosen[0]?.id ?? null);
                setStep(index);
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>

        {!cafe24.connected && (
          <div className="demo-note">
            <span className="dot" />
            <p>
              {cafe24.configured
                ? "카페24 앱 정보는 저장됐습니다. 로그인 연결만 하면 등록이 됩니다."
                : "카페24를 연결하면 등록까지 됩니다. 지금은 사진과 문구까지 준비할 수 있어요."}
            </p>
            <button onClick={() => setDialog(true)}>연결하기</button>
          </div>
        )}

        {step === 0 && (
          <>
            <div className="section-bar">
              <h2>가져온 옷 <span>{String(products.length).padStart(2, "0")}</span></h2>
            </div>

            {products.length === 0 ? (
              <div className="pending-preview">
                {!loaded ? (
                  <b>불러오는 중</b>
                ) : loadFailed ? (
                  <>
                    <b>상품을 불러오지 못했습니다</b>
                    <span>잠깐 끊긴 것일 수 있습니다</span>
                    <button className="primary" onClick={load} style={{ marginTop: 14, maxWidth: 200 }}>
                      다시 불러오기
                    </button>
                  </>
                ) : (
                  <>
                    <b>아직 가져온 옷이 없습니다</b>
                    <span>신상마켓에서 상품을 가져오면 여기에 뜹니다</span>
                  </>
                )}
              </div>
            ) : (
              <div className="product-grid">
                {products.map((product) => {
                  const cover = (photos[product.id] || [])[0];
                  const picked = selected.includes(product.id);
                  return (
                    <article className={"product" + (picked ? " picked" : "")} key={product.id}>
                      <div className="product-image">
                        {cover?.url ? (
                          <img src={cover.url} alt={product.title} />
                        ) : (
                          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#aaa", fontSize: 13 }}>
                            실착 사진 없음
                          </div>
                        )}
                        <div className="check-wrap">
                          <input
                            type="checkbox"
                            aria-label={`${product.title} 고르기`}
                            checked={picked}
                            onChange={(e) =>
                              setSelected(e.target.checked
                                ? [...selected, product.id]
                                : selected.filter((id) => id !== product.id))
                            }
                          />
                        </div>
                        <span className="image-tag">
                          {product.status === "registered" ? "등록됨" : product.single_buy ? "낱장 가능" : "낱장 불가"}
                        </span>
                        <button
                          className="image-edit"
                          onClick={() => {
                            setActiveId(product.id);
                            if (!picked) setSelected((v) => [...v, product.id]);
                            setStep(1);
                          }}
                        >
                          사진·문구 넣기
                        </button>
                      </div>
                      <div className="product-info">
                        <small>{product.vendor || "신상마켓"}</small>
                        <h3>{cleanTitle(product.title) || product.title}</h3>
                        <p>
                          {product.sale_price ? `${won.format(product.sale_price)}원` : "판매가 미설정"}
                          <span>도매 {won.format(product.wholesale_price)}원</span>
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 1 && current && (
          <section className="editor">
            <div className="editor-image">
              <div className="section-bar">
                <h2>실착 사진</h2>
                <span className="testbadge">{activePhotos.length}장</span>
              </div>

              {activePhotos.length ? (
                activePhotos.map((photo) => (
                  <div key={photo.id} style={{ position: "relative", marginBottom: 10 }}>
                    <img src={photo.url} alt="실착 사진" />
                    <button
                      className="icon"
                      onClick={() => removePhoto(photo)}
                      style={{
                        position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.6)",
                        color: "#fff", border: 0, borderRadius: 8, padding: "6px 10px", fontSize: 12,
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))
              ) : (
                <div className="pending-preview">
                  <b>사진을 올려 주세요</b>
                  <span>직접 입고 찍은 사진이 상세페이지가 됩니다</span>
                </div>
              )}

              <label className="upload-button">
                사진 추가
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    upload(e.target.files?.[0], current.id);
                    e.target.value = "";
                  }}
                />
              </label>

              {chosen.length > 1 && (
                <div className="item-switch">
                  {chosen.map((product) => (
                    <button
                      key={product.id}
                      className={activeId === product.id ? "selected-pill" : ""}
                      onClick={() => setActiveId(product.id)}
                    >
                      {cleanTitle(product.title).slice(0, 12) || product.title.slice(0, 12)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="editor-fields">
              <span className="eyebrow">DETAIL STUDIO</span>
              <h2>어떻게 소개할까요?</h2>
              <p>
                {current.vendor} · 도매 {won.format(current.wholesale_price)}원
                {current.single_buy === false && " · 낱장 불가(매장 문의)"}
              </p>

              {current.sale_price ? (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "-6px 0 14px" }}>
                  매입 {won.format(Math.round(current.wholesale_price * 1.1))}원 · 수수료 6%{" "}
                  {won.format(Math.round(current.sale_price * 0.06))}원 → 순마진{" "}
                  <b style={{ color: "var(--foreground)" }}>
                    {won.format(
                      current.sale_price -
                        Math.round(current.wholesale_price * 1.1) -
                        Math.round(current.sale_price * 0.06),
                    )}
                    원
                  </b>
                </p>
              ) : null}

              <label>
                상품명
                <input
                  value={current.title}
                  onChange={(e) => patch(current.id, { title: e.target.value })}
                />
              </label>

              <label>
                판매가 (원)
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={current.sale_price ?? ""}
                  onChange={(e) => patch(current.id, { sale_price: Number(e.target.value) || null })}
                  placeholder={String(Math.round((current.wholesale_price * 2.2) / 100) * 100)}
                />
              </label>

              <label>
                입어보고 느낀 점
                <textarea
                  rows={5}
                  value={current.memo ?? ""}
                  onChange={(e) => patch(current.id, { memo: e.target.value })}
                  placeholder="핏, 두께, 비침, 움직일 때 느낌처럼 사진으로는 알 수 없는 것"
                />
              </label>

              <div className="prompt-chips">
                {["생각보다 얇아요", "핏이 여유 있어요", "비침 없어요", "키 165 기준 발목"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() =>
                      patch(current.id, { memo: current.memo ? `${current.memo}\n${chip}` : chip })
                    }
                  >
                    {chip} +
                  </button>
                ))}
              </div>

              {current.reel_idea && (
                <div className="demo-note" style={{ margin: "4px 0 16px" }}>
                  <span className="dot" />
                  <p>{current.reel_idea}</p>
                </div>
              )}

              <button className="primary full" onClick={() => makePreview(current)}>
                상세페이지 만들기
              </button>

              {preview ? (
                <div style={{ marginTop: 18, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                  <iframe title="상세페이지 미리보기" sandbox="" srcDoc={preview} style={{ width: "100%", height: 420, border: 0 }} />
                </div>
              ) : (
                <div className="pending-preview">
                  <b>상세페이지가 여기 나옵니다</b>
                  <span>사진과 문구를 넣고 위 버튼을 누르세요</span>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="review">
            <h2>보내기 전 확인</h2>
            <p>진열 안 함 · 판매 안 함 상태로 올라갑니다. 카페24에서 확인한 뒤 판매를 시작하세요.</p>

            {chosen.map((product) => {
              const count = (photos[product.id] || []).length;
              const ready = Boolean(product.sale_price && count && product.detail_html);
              return (
                <div className="review-item" key={product.id}>
                  {photos[product.id]?.[0]?.url && <img src={photos[product.id][0].url} alt={product.title} />}
                  <div>
                    <h3>{cleanTitle(product.title) || product.title}</h3>
                    <strong>{product.sale_price ? `${won.format(product.sale_price)}원` : "판매가 입력 필요"}</strong>
                    <p>
                      실착 사진 {count}장 · {product.detail_html ? "상세페이지 준비됨" : "상세페이지 없음"}
                    </p>
                    <span className="testbadge">
                      {product.cafe24_product_no ? `카페24 ${product.cafe24_product_no}` : ready ? "보낼 수 있음" : "준비 부족"}
                    </span>
                  </div>
                  {product.cafe24_product_no ? (
                    <button disabled>등록됨</button>
                  ) : (
                    <button
                      onClick={() => (ready && cafe24.connected ? register(product) : setStep(1))}
                      disabled={busy}
                    >
                      {cafe24.connected ? (ready ? "보내기" : "수정") : "연결 필요"}
                    </button>
                  )}
                </div>
              );
            })}

            {!cafe24.connected && (
              <div className="register-note">
                <p>카페24 연결이 필요합니다.<br />연결 전에는 상품이 등록되지 않습니다.</p>
              </div>
            )}
          </section>
        )}

        <div className="bottom-bar">
          <div>
            <span>{selected.length}벌 선택</span>
            <small>
              {step === 0 ? "고른 옷에 실착 사진을 붙입니다." : step === 1 ? "사진과 문구를 넣고 상세페이지를 만드세요." : "확인 후 카페24로 보냅니다."}
            </small>
          </div>
          {step > 0 && (
            <button className="back" onClick={() => setStep(step - 1)} aria-label="이전 단계">←</button>
          )}
          <button
            className="primary"
            disabled={!selected.length || step === 2}
            onClick={() => {
              if (!activeId) setActiveId(chosen[0]?.id ?? null);
              setStep(step + 1);
            }}
          >
            {step === 0 ? "사진·문구 넣기" : "보내기 전 확인"} →
          </button>
        </div>

        <footer>
          내 작업실 <span>pickroom</span>
          <button className="icon" onClick={signOut} style={{ marginLeft: 12, background: "none", border: 0, color: "inherit", textDecoration: "underline" }}>
            로그아웃
          </button>
        </footer>
      </main>

      {notice && (
        <div role="status" className="notice" onClick={() => setNotice("")}>
          {notice}
          <button aria-label="알림 닫기">×</button>
        </div>
      )}

      {dialog && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,17,22,.5)", zIndex: 60, display: "grid", placeItems: "center", padding: 20 }}
          onClick={() => setDialog(false)}
        >
          <div className="connection-dialog" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>설정</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted-foreground)" }}>
              {cafe24.connected
                ? `${cafe24.mallId} 쇼핑몰에 연결되어 있습니다.`
                : "카페24 개발자센터에서 만든 앱의 정보를 넣어 주세요."}
            </p>

            <form onSubmit={saveCafe24}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>쇼핑몰 아이디</label>
              <input
                value={form.mallId}
                onChange={(e) => setForm({ ...form, mallId: e.target.value })}
                placeholder="myshop"
                style={{ width: "100%", padding: 12, marginBottom: 14, border: "1px solid var(--input)", borderRadius: 10 }}
              />
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Client ID</label>
              <input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                style={{ width: "100%", padding: 12, marginBottom: 14, border: "1px solid var(--input)", borderRadius: 10 }}
              />
              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Client Secret</label>
              <input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                autoComplete="off"
                style={{ width: "100%", padding: 12, marginBottom: 18, border: "1px solid var(--input)", borderRadius: 10 }}
              />
              <button className="primary full" type="submit" disabled={busy}>앱 정보 저장</button>
            </form>

            {cafe24.configured && (
              <a
                className="primary full"
                href="/api/cafe24/connect"
                style={{ display: "block", textAlign: "center", marginTop: 10, textDecoration: "none" }}
              >
                카페24 로그인
              </a>
            )}

            <button className="primary full" onClick={() => setDialog(false)} style={{ marginTop: 10, background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
