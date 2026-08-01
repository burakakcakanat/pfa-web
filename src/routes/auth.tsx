import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  head: () => ({
    meta: [
      { title: "Giriş Yap — PFA" },
      { name: "description", content: "PFA hesabınıza giriş yapın veya yeni bir hesap oluşturun." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogle() {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if ("error" in result && result.error) throw result.error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google ile giriş başarısız.");
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const target = isSafeRedirect(redirect) ? redirect! : "/hesabim";
        navigate({ href: target, replace: true });
      }
    });
  }, [navigate, redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const target = isSafeRedirect(redirect) ? redirect! : "/hesabim";
      navigate({ href: target, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        <div className="mb-6 flex gap-2 rounded-md border border-border p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-sm px-3 py-2 text-sm transition-colors ${mode === "signin" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-sm px-3 py-2 text-sm transition-colors ${mode === "signup" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            Üye Ol
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">Ad Soyad</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">E-posta</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-foreground/80">Şifre</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "..." : mode === "signin" ? "Giriş Yap" : "Üye Ol"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>veya</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={onGoogle}
          className="btn-outline flex w-full items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C41 35.1 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          Google ile devam et
        </button>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-accent">Ana sayfaya dön</Link>
        </div>
      </div>
    </div>
  );
}

function isSafeRedirect(v: string | undefined): boolean {
  if (!v) return false;
  return v.startsWith("/") && !v.startsWith("//");
}