import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const target = isSafeRedirect(redirect) ? redirect! : "/hesabim";
        navigate({ to: target, replace: true });
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
      navigate({ to: target, replace: true });
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