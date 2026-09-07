"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mode = "password" | "signup" | "link";

const field: React.CSSProperties = {
  width: "100%", padding: "14px 16px", fontSize: 16,
  border: "1px solid var(--input)", borderRadius: 12, marginBottom: 12,
};

const linkButton: React.CSSProperties = {
  display: "block", margin: "14px auto 0", background: "none", border: 0,
  color: "var(--muted-foreground)", fontSize: 14, textDecoration: "underline",
};

export default function Login() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState("");

  function go(next: Mode) {
    setMode(next);
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setState("working");
    const supabase = supabaseBrowser();
    const address = email.trim();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: address, password });
      if (error) {
        setError(error.message);
        setState("idle");
        return;
      }
      if (!data.session) {
        setError("계정은 만들어졌지만 메일 확인이 켜져 있습니다. Supabase에서 메일 확인을 끄거나, 메일함의 확인 링크를 눌러 주세요.");
        setState("idle");
        return;
      }
      window.location.href = "/";
      return;
    }

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "주소나 비밀번호가 맞지 않습니다. 처음이시면 아래 ‘계정 만들기’를 누르세요."
            : error.message,
        );
        setState("idle");
        return;
      }
      window.location.href = "/";
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    setState("sent");
  }

  const heading =
    mode === "signup" ? "계정 만들기" : mode === "link" ? "메일 링크로 들어가기" : "내 작업실";

  return (
    <div className="shell">
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "72px 24px" }}>
        <span className="eyebrow">PICKROOM</span>
        <h1 style={{ marginTop: 10 }}>{heading}</h1>
        <p style={{ color: "var(--muted-foreground)", margin: "12px 0 30px" }}>
          {mode === "signup"
            ? "주소와 비밀번호를 정하면 바로 들어갑니다."
            : "등록된 주소로만 들어올 수 있습니다."}
        </p>

        {state === "sent" ? (
          <div className="demo-note" style={{ display: "block" }}>
            <p style={{ margin: 0 }}>
              <b>{email}</b> 으로 로그인 링크를 보냈습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>이메일</label>
            <input
              id="email" type="email" required autoComplete="email"
              inputMode="email" autoCapitalize="none" autoCorrect="off"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="me@example.com" style={field}
            />

            {mode !== "link" && (
              <>
                <label htmlFor="password" style={{ display: "block", fontSize: 14, margin: "6px 0 8px" }}>
                  비밀번호
                </label>
                <input
                  id="password" type="password" required minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "8자 이상" : ""}
                  style={field}
                />
              </>
            )}

            {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "4px 0 14px", lineHeight: 1.6 }}>{error}</p>}

            <button className="primary full" type="submit" disabled={state === "working"}>
              {state === "working"
                ? "확인 중"
                : mode === "signup" ? "계정 만들고 들어가기"
                : mode === "link" ? "로그인 링크 받기"
                : "로그인"}
            </button>

            {mode === "password" && (
              <>
                <button type="button" onClick={() => go("signup")} style={linkButton}>
                  처음이신가요? 계정 만들기
                </button>
                <button type="button" onClick={() => go("link")} style={{ ...linkButton, margin: "8px auto 0", fontSize: 13 }}>
                  비밀번호를 잊었어요
                </button>
              </>
            )}
            {mode !== "password" && (
              <button type="button" onClick={() => go("password")} style={linkButton}>
                비밀번호로 들어가기
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
