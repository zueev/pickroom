"use client";
import { useState } from "react";

export default function Gate() {
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function open(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const response = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(body.error || "들어가지 못했습니다.");
    window.location.href = "/";
  }

  return (
    <div className="shell">
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "96px 24px" }}>
        <span className="eyebrow">PICKROOM</span>
        <h1 style={{ marginTop: 10 }}>내 작업실</h1>
        <p style={{ color: "var(--muted-foreground)", margin: "12px 0 30px" }}>
          암구호를 넣으면 들어갑니다. 이 기기에서는 다시 묻지 않습니다.
        </p>

        <form onSubmit={open}>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="암구호"
            style={{
              width: "100%", padding: "16px 18px", fontSize: 17,
              border: "1px solid var(--input)", borderRadius: 12, marginBottom: 14,
            }}
          />
          {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "0 0 14px" }}>{error}</p>}
          <button className="primary full" type="submit" disabled={busy}>
            {busy ? "확인 중" : "들어가기"}
          </button>
        </form>
      </main>
    </div>
  );
}
