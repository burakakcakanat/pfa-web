import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; redirect_uris?: string[] } | null;
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Erişim İzni — PFA" },
      { name: "description", content: "Bir uygulamanın PFA hesabınıza erişmesine izin verin veya reddedin." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error }) => (
    <ConsentShell>
      <p className="text-sm text-destructive">
        İzin ekranı yüklenemedi: {error instanceof Error ? error.message : "bilinmeyen hata"}
      </p>
    </ConsentShell>
  ),
  component: ConsentPage,
});

function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8">{children}</div>
    </div>
  );
}

function ConsentPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authorizationId =
    typeof window !== "undefined"
      ? new URL(window.location.href).searchParams.get("authorization_id")
      : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authorizationId) {
        setStatus("error");
        setMessage("Geçersiz veya eksik yetkilendirme isteği (authorization_id yok).");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const next = window.location.pathname + window.location.search;
        window.location.replace(`/auth?redirect=${encodeURIComponent(next)}`);
        return;
      }
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      const redirect = data?.redirect_url ?? data?.redirect_to;
      if (redirect && !data?.client) {
        window.location.replace(redirect);
        return;
      }
      setEmail(userData.user.email ?? null);
      setDetails(data);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  const decide = useCallback(
    async (approve: boolean) => {
      if (!authorizationId) return;
      setBusy(true);
      setMessage(null);
      const api = oauthApi();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setStatus("error");
        setMessage(error.message);
        return;
      }
      const redirect = data?.redirect_url ?? data?.redirect_to;
      if (redirect) {
        window.location.replace(redirect);
        return;
      }
      setBusy(false);
      setMessage(approve ? "İzin verildi." : "İzin reddedildi.");
    },
    [authorizationId],
  );

  if (status === "loading") {
    return (
      <ConsentShell>
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </ConsentShell>
    );
  }

  if (status === "error") {
    return (
      <ConsentShell>
        <h1 className="mb-2 font-serif text-2xl text-foreground">Bağlantı kurulamadı</h1>
        <p className="text-sm text-destructive">{message ?? "Yetkilendirme isteği geçersiz veya süresi dolmuş."}</p>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-accent">Ana sayfaya dön</Link>
        </div>
      </ConsentShell>
    );
  }

  const clientName =
    details?.client?.name ?? details?.client?.client_name ?? "Harici uygulama";
  const redirectUri = details?.redirect_uri ?? details?.client?.redirect_uris?.[0];
  const scopes =
    details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <ConsentShell>
      <h1 className="mb-2 font-serif text-2xl text-foreground">
        {clientName} uygulamasını PFA hesabınıza bağla
      </h1>
      <p className="mb-6 text-sm text-foreground/80">
        Bu izin, {clientName} uygulamasının PFA araçlarını sizin adınıza kullanmasını sağlar.
      </p>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Giriş yapan hesap</dt>
          <dd className="text-foreground">{email ?? "—"}</dd>
        </div>
        {redirectUri && (
          <div>
            <dt className="text-muted-foreground">Yönlendirme adresi</dt>
            <dd className="break-all text-foreground">{redirectUri}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">İstenen bilgiler</dt>
          <dd>
            <ul className="list-disc pl-5 text-foreground">
              {scopes.length === 0 && <li>Temel profil bilgileriniz</li>}
              {scopes.map((scope) => (
                <li key={scope}>{scopeLabel(scope)}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Bu izin, PFA'nın kendi yetki ve gizlilik kurallarını devre dışı bırakmaz.
      </p>

      {message && <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</div>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="btn-primary flex-1 disabled:opacity-60"
        >
          {busy ? "…" : "İzin ver"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="btn-outline flex-1 disabled:opacity-60"
        >
          Bağlantıyı iptal et
        </button>
      </div>
    </ConsentShell>
  );
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "openid":
      return "Kimliğinizi doğrulama";
    case "email":
      return "E-posta adresinizi paylaşma";
    case "profile":
      return "Temel profil bilgilerinizi paylaşma";
    default:
      return `Ek izin: ${scope}`;
  }
}