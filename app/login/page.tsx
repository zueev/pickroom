"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const field: React.CSSProperties = {
  width: "100%", padding: "14px 16px", fontSize: 16,
  border: "1px solid var(--input)", borderRadius: 12, marginBottom: 12,
};

export default function Login() {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState("");

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setState("working");
    const supabase = supabaseBrowser();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "주소나 비밀번호가 맞지 않습니다. 비밀번호를 아직 만들지 않으셨다면 아래 ‘메일 링크로 들어가기’를 쓰세요."
            : error.message,
        );
        setState("idle");
        return;
      }
      window.location.href = "/";
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
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
              메일함에서 링크를 눌러 주세요. 들어오신 뒤 설정에서 비밀번호를 정하면
              다음부터는 메일이 필요 없습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={signIn}>
            <label htmlFor="email" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>이메일</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="me@example.com" style={field}
            />

            {mode === "password" && (
              <>
                <label htmlFor="password" style={{ display: "block", fontSize: 14, margin: "6px 0 8px" }}>
                  비밀번호
                </label>
                <input
                  id="password" type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={field}
                />
              </>
            )}

            {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "4px 0 14px" }}>{error}</p>}

            <button className="primary full" type="submit" disabled={state === "working"}>
              {state === "working" ? "확인 중" : mode === "password" ? "로그인" : "로그인 링크 받기"}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === "password" ? "link" : "password"); setError(""); }}
              style={{
                display: "block", margin: "16px auto 0", background: "none", border: 0,
                color: "var(--muted-foreground)", fontSize: 14, textDecoration: "underline",
              }}
            >
              {mode === "password" ? "메일 링크로 들어가기" : "비밀번호로 들어가기"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
