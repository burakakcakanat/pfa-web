import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/sifre-yenile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Şifre Yenile — PFA" },
      { name: "description", content: "PFA hesabınız için yeni bir şifre belirleyin." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;
    // The Supabase client parses the recovery token from the URL hash on load
    // and emits PASSWORD_RECOVERY / SIGNED_IN once the session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        settled = true;
        setPhase("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setPhase("ready");
      }
    });

    const timer = setTimeout(() => {
      if (!settled) setPhase((p) => (p === "checking" ? "invalid" : p));
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== repeat) {
      setError("Şifreler birbiriyle uyuşmuyor.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPhase("done");
      setTimeout(() => navigate({ href: "/hesabim", replace: true }), 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /weak|least|short/i.test(msg)
          ? "Şifre yeterince güçlü değil. En az 8 karakter kullanın."
          : /expired|invalid|session/i.test(msg)
            ? "Bağlantının süresi dolmuş görünüyor. Lütfen yeni bir sıfırlama bağlantısı isteyin."
            : "Şifre güncellenemedi. Lütfen tekrar deneyin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">
        <h1 className="mb-2 font-serif text-2xl text-foreground">Yeni şifre belirle</h1>

        {phase === "checking" && (
          <p className="text-sm text-muted-foreground">Bağlantı doğrulanıyor…</p>
        )}

        {phase === "invalid" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bu şifre yenileme bağlantısı geçersiz ya da süresi dolmuş. Lütfen giriş sayfasından
              yeni bir sıfırlama bağlantısı isteyin.
            </p>
            <Link to="/auth" className="btn-primary inline-flex">
              Giriş sayfasına dön
            </Link>
          </div>
        )}

        {phase === "done" && (
          <p className="text-sm text-foreground/80">
            Şifreniz güncellendi. Hesabınıza yönlendiriliyorsunuz…
          </p>
        )}

        {phase === "ready" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              En az 8 karakterden oluşan yeni bir şifre girin.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">Yeni şifre</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-foreground/80">Yeni şifre (tekrar)</span>
              <input
                type="password"
                required
                minLength={8}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "..." : "Şifreyi güncelle"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-accent">Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  );
}
