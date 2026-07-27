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
import { BRAND_TAGLINE } from "@/lib/brand";
import { NewsletterForm } from "@/components/newsletter-form";
import { Instagram, Linkedin, Youtube, Twitter } from "lucide-react";

function FooterNewsletter() {
  return <NewsletterForm variant="footer" source="footer" />;
}

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
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
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
  { to: "/degerlendirme", label: "PFA Ölçeği" },
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
        <Link
          to="/"
          className="flex shrink-0 flex-col items-start justify-center leading-none"
          aria-label="PFA — Psiko-Fonksiyonel Analiz"
        >
          <span
            className="font-serif text-[28px] font-semibold text-primary sm:text-[34px]"
            style={{ letterSpacing: "0.08em", lineHeight: 1 }}
          >
            PFA
          </span>
          <span
            className="text-[8px] tracking-[0.22em] text-primary/80 sm:text-[9.5px] sm:tracking-[0.28em]"
            style={{
              marginTop: "3px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {BRAND_TAGLINE.tr}
          </span>
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
    { key: "social_instagram", label: "Instagram", Icon: Instagram },
    { key: "social_linkedin", label: "LinkedIn", Icon: Linkedin },
    { key: "social_x", label: "X", Icon: Twitter },
    { key: "social_youtube", label: "YouTube", Icon: Youtube },
  ].filter((s) => socials[s.key]);
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link
            to="/"
            className="flex flex-col items-start justify-center leading-none"
            aria-label="PFA — Psiko-Fonksiyonel Analiz"
          >
            <span
              className="font-serif text-[34px] font-semibold text-primary"
              style={{ letterSpacing: "0.08em", lineHeight: 1 }}
            >
              PFA
            </span>
            <span
              className="text-[9.5px] tracking-[0.28em] text-primary/80"
              style={{
                marginTop: "3px",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {BRAND_TAGLINE.tr}
            </span>
          </Link>
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
                  <s.Icon className="h-4 w-4" strokeWidth={1.6} />
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

