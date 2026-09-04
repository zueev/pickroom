"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setState("sending");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  return (
    <div className="shell">
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <span className="eyebrow">PICKROOM</span>
        <h1 style={{ marginTop: 10 }}>내 작업실</h1>
        <p style={{ color: "var(--muted-foreground)", margin: "12px 0 32px" }}>
          등록된 주소로만 들어올 수 있습니다.
        </p>

        {state === "sent" ? (
          <div className="demo-note" style={{ display: "block" }}>
            <p style={{ margin: 0 }}>
              <b>{email}</b> 으로 로그인 링크를 보냈습니다.<br />
              메일함에서 링크를 눌러 주세요.
            </p>
          </div>
        ) : (
          <form onSubmit={send}>
            <label htmlFor="email" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="me@example.com"
              style={{
                width: "100%", padding: "14px 16px", fontSize: 16,
                border: "1px solid var(--input)", borderRadius: 12, marginBottom: 16,
              }}
            />
            {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "0 0 14px" }}>{error}</p>}
            <button className="primary full" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "보내는 중" : "로그인 링크 받기"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
