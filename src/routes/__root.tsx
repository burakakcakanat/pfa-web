import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import pfaLogoAsset from "@/assets/pfa-logo-canva.png.asset.json";
const pfaLogo = pfaLogoAsset.url;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PFA — Psİko-Fonksİyonel Analİz | İnsan Bilincinin İşlevsel Haritası" },
      { name: "description", content: "Psİko-Fonksİyonel Analİz (PFA): insan bilincini yedi işlevsel seviyeye ayıran bir harita. Kitaplar, PFA Ölçeği, birebir seanslar, webinarlar ve eğitim." },
      { name: "author", content: "Burak Akçakanat" },
      { property: "og:title", content: "PFA — Psİko-Fonksİyonel Analİz" },
      { property: "og:description", content: "İnsan bilincinin yedi seviyeli işlevsel haritası." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/kitaplar", label: "Kitaplar" },
  { to: "/degerlendirme", label: "PA Ölçeği" },
  { to: "/seanslar", label: "Seanslar" },
  { to: "/webinarlar", label: "Webinarlar" },
  { to: "/blog", label: "Blog" },
  { to: "/uygulayici-olun", label: "Uygulayıcı Olun" },
  { to: "/hakkinda", label: "Hakkında" },
  { to: "/iletisim", label: "İletişim" },
] as const;

function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const check = async (uid: string | undefined) => {
      if (!uid) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      setIsAdmin(!!data);
    };
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      check(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      check(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center" aria-label="PFA — Psİko-Fonksİyonel Analİz">
          <img
            src={pfaLogo}
            alt="PFA — Psycho-Functional Analysis"
            className="h-10 w-auto md:h-12"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-[0.82rem] tracking-wide lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-foreground/75 transition-colors hover:text-accent"
              activeProps={{ className: "text-accent" }}
            >
              {l.label}
            </Link>
          ))}
          {email ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-xs tracking-wide">
                {email.split("@")[0]}
              </summary>
              <div className="absolute right-0 mt-2 flex w-44 flex-col rounded-md border border-border bg-background shadow-sm">
                <Link to="/hesabim" className="border-b border-border/60 px-4 py-2 text-sm hover:text-accent">Hesabım</Link>
                {isAdmin && (
                  <Link to="/admin" className="border-b border-border/60 px-4 py-2 text-sm hover:text-accent">Admin</Link>
                )}
                <button type="button" onClick={signOut} className="px-4 py-2 text-left text-sm hover:text-accent">Çıkış</button>
              </div>
            </details>
          ) : (
            <Link to="/auth" className="rounded-md border border-accent px-3 py-1.5 text-xs tracking-wide text-accent hover:bg-accent hover:text-accent-foreground">
              Giriş Yap
            </Link>
          )}
        </nav>
        <details className="lg:hidden">
          <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-1.5 text-sm">
            Menü
          </summary>
          <div className="absolute right-4 mt-2 flex w-56 flex-col rounded-md border border-border bg-background shadow-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            {email ? (
              <>
                <Link to="/hesabim" className="border-b border-border/60 px-4 py-2.5 text-sm">Hesabım</Link>
                {isAdmin && (<Link to="/admin" className="border-b border-border/60 px-4 py-2.5 text-sm">Admin</Link>)}
                <button type="button" onClick={signOut} className="px-4 py-2.5 text-left text-sm">Çıkış</button>
              </>
            ) : (
              <Link to="/auth" className="px-4 py-2.5 text-sm text-accent">Giriş Yap</Link>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}

function SiteFooter() {
  const [socials, setSocials] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (!alive) return;
      const out: Record<string, string> = {};
      for (const r of (data ?? []) as any[]) if (r.value) out[r.key] = r.value;
      setSocials(out);
    });
    return () => { alive = false; };
  }, []);
  const socialItems = [
    { key: "social_instagram", label: "Instagram", icon: "instagram" },
    { key: "social_linkedin", label: "LinkedIn", icon: "linkedin" },
    { key: "social_x", label: "X", icon: "x" },
    { key: "social_youtube", label: "YouTube", icon: "youtube" },
  ].filter((s) => socials[s.key]);
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <img
            src={pfaLogo}
            alt="PFA — Psycho-Functional Analysis"
            className="h-14 w-auto"
          />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            İnsan bilincinin yedi seviyeli işlevsel haritası.
          </p>
          {socialItems.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {socialItems.map((s) => (
                <a
                  key={s.key}
                  href={socials[s.key]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Keşfet</div>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.slice(1, 5).map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daha</div>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.slice(5).map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-accent">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <FooterNewsletter />
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-6 text-xs text-muted-foreground">
          © 2026 Burak Akçakanat — Psİko-Fonksİyonel Analİz. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const c = "h-4 w-4";
  if (name === "instagram") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "linkedin") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM10 9.75h3.8v1.55h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.05c0-1.2-.03-2.75-1.75-2.75-1.75 0-2.02 1.3-2.02 2.65V21H10z" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2H21l-6.53 7.46L22 22h-6.828l-4.79-6.24L4.8 22H2l7.02-8.02L2 2h6.914l4.34 5.74L18.244 2zm-2.394 18h1.7L7.29 4H5.49l10.36 16z" />
      </svg>
    );
  }
  if (name === "youtube") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23 7.2s-.22-1.56-.9-2.24c-.86-.9-1.83-.9-2.27-.96C16.7 3.75 12 3.75 12 3.75s-4.7 0-7.83.25c-.44.06-1.4.06-2.27.96C1.22 5.64 1 7.2 1 7.2S.75 9.04.75 10.87v1.76C.75 14.46 1 16.3 1 16.3s.22 1.56.9 2.24c.87.9 2 .87 2.5.97C6.2 19.75 12 19.8 12 19.8s4.7 0 7.83-.26c.44-.06 1.4-.06 2.27-.96.68-.68.9-2.24.9-2.24s.25-1.83.25-3.67v-1.76C23.25 9.04 23 7.2 23 7.2zM9.75 14.5V8.62l6.13 2.94-6.13 2.94z" />
      </svg>
    );
  }
  return null;
}
