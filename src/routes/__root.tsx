import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_TAGLINE } from "@/lib/brand";
import { localeFromPathname, switchTarget, type Locale } from "@/lib/i18n";
import { NewsletterForm } from "@/components/newsletter-form";
import { Instagram, Linkedin, Youtube, Twitter, ChevronDown, BookOpen } from "lucide-react";

function FooterNewsletter() {
  return <NewsletterForm source="footer" />;
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
      { title: "PFA — Psiko-Fonksiyonel Analiz Bilinç Haritası" },
      { name: "description", content: "Psiko-Fonksiyonel Analiz (PFA): insan bilincini yedi işlevsel seviyeye ayıran bir harita. Kitaplar, PFA Ölçeği, birebir seanslar, webinarlar ve eğitim." },
      { name: "author", content: "Burak Akçakanat" },
      { property: "og:title", content: "PFA — Psiko-Fonksiyonel Analiz" },
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
  const lang = useRouterState({ select: (s) => localeFromPathname(s.location.pathname) });
  return (
    <html lang={lang}>
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
  const locale = useRouterState({ select: (s) => localeFromPathname(s.location.pathname) });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        {locale === "en" ? <EnHeader /> : <SiteHeader />}
        <main className="flex-1">
          <Outlet />
        </main>
        {locale === "en" ? <EnFooter /> : <SiteFooter />}
      </div>
    </QueryClientProvider>
  );
}

/** Quiet TR | EN switcher. Uses a plain anchor so the document language attribute
 *  is always correct after switching. */
function LanguageSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const target = switchTarget(pathname);
  const other = locale === "en" ? "TR" : "EN";
  return (
    <a
      href={target}
      hrefLang={locale === "en" ? "tr" : "en"}
      aria-label={locale === "en" ? "Türkçe" : "English"}
      className={
        className ??
        "shrink-0 text-[0.7rem] tracking-[0.18em] text-muted-foreground transition-colors hover:text-accent"
      }
    >
      {locale === "en" ? "TR" : "TR | EN"}
      <span className="sr-only"> — {other}</span>
    </a>
  );
}

const EN_NAV: NavItem[] = [
  { to: "/en", label: "Home" },
  { to: "/en/books", label: "Books" },
  { to: "/en/levels", label: "Levels" },
  { to: "/en/about", label: "About" },
  { to: "/en/contact", label: "Contact" },
  { to: "/en/refund-policy", label: "Refund policy" },
  { to: "/en/terms", label: "Terms of use" },
  { to: "/en/privacy", label: "Privacy policy" },
];

/** Primary English header links (legal pages live in the footer only). */
const EN_HEADER_NAV = EN_NAV.filter(
  (l) => l.to !== "/en/refund-policy" && l.to !== "/en/terms" && l.to !== "/en/privacy",
);

function EnHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <a
          href="/en"
          className="flex shrink-0 flex-col items-start justify-center leading-none"
          aria-label="PFA — Psycho-Functional Analysis"
        >
          <span
            className="font-serif text-[28px] font-semibold text-primary sm:text-[34px]"
            style={{ letterSpacing: "0.08em", lineHeight: 1 }}
          >
            PFA
          </span>
          <span
            className="text-[8px] tracking-[0.22em] text-primary/80 sm:text-[9.5px] sm:tracking-[0.28em]"
            style={{ marginTop: "3px", fontFamily: "Inter, sans-serif" }}
          >
            {BRAND_TAGLINE.en}
          </span>
        </a>
        <nav className="hidden min-w-0 items-center gap-5 text-[0.82rem] tracking-wide lg:flex">
          {EN_HEADER_NAV.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="shrink-0 whitespace-nowrap text-foreground/75 transition-colors hover:text-accent"
            >
              {l.label}
            </a>
          ))}
          <EnAuthLinks />
          <LanguageSwitcher locale="en" />
        </nav>
        <EnMobileMenu />
      </div>
    </header>
  );
}

/** Session-aware account link for the English header (desktop + mobile panel). */
function useSessionEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return email;
}

function EnAuthLinks() {
  const email = useSessionEmail();
  return (
    <a
      href={email ? "/hesabim" : "/auth"}
      className="shrink-0 whitespace-nowrap rounded-md border border-accent px-3 py-1.5 text-xs tracking-wide text-accent hover:bg-accent hover:text-accent-foreground"
    >
      {email ? "Account" : "Sign in"}
    </a>
  );
}

function EnMobileMenu() {
  const email = useSessionEmail();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="en-mobile-nav-menu"
        aria-label="Menu"
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
      >
        <Menu className="h-4 w-4" strokeWidth={1.6} />
        Menu
      </button>
      {open && (
        <div
          id="en-mobile-nav-menu"
          ref={menuRef}
          className="absolute right-4 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col rounded-md border border-border bg-background shadow-sm"
        >
          <div className="py-2">
            {EN_HEADER_NAV.filter((l) => l.to !== "/en").map((l) => (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className="block whitespace-nowrap px-4 py-2 text-sm"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="border-t border-border/60 py-2">
            <a
              href={email ? "/hesabim" : "/auth"}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm"
            >
              {email ? "Account" : "Sign in"}
            </a>
            <div className="px-4 py-2">
              <LanguageSwitcher locale="en" className="text-[0.7rem] tracking-[0.18em] text-muted-foreground hover:text-accent" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnFooter() {
  const pageLinks = EN_NAV.slice(1, 5);
  const legalLinks = EN_NAV.filter(
    (l) => l.to === "/en/terms" || l.to === "/en/refund-policy" || l.to === "/en/privacy",
  );
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="min-w-0">
          <a
            href="/en"
            className="flex flex-col items-start justify-center leading-none"
            aria-label="PFA — Psycho-Functional Analysis"
          >
            <span
              className="font-serif text-[34px] font-semibold text-primary"
              style={{ letterSpacing: "0.08em", lineHeight: 1 }}
            >
              PFA
            </span>
            <span
              className="text-[9.5px] tracking-[0.28em] text-primary/80"
              style={{ marginTop: "3px", fontFamily: "Inter, sans-serif" }}
            >
              {BRAND_TAGLINE.en}
            </span>
          </a>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A Map of Consciousness — from Survival to Enlightenment
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://www.instagram.com/psychofunctionalanalysis"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.6} />
            </a>
            <a
              href="https://www.amazon.com/author/burak-akcakanat"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Amazon author page"
              className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
            >
              <BookOpen className="h-4 w-4" strokeWidth={1.6} />
              Amazon
            </a>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Explore</div>
          <ul className="mt-4 space-y-2 text-sm">
            {pageLinks.map((l) => (
              <li key={l.to}>
                <a href={l.to} className="hover:text-accent">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="mailto:info@psychofunctionalanalysis.com" className="hover:text-accent">
                info@psychofunctionalanalysis.com
              </a>
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</div>
          <ul className="mt-4 space-y-2 text-sm">
            {legalLinks.map((l) => (
              <li key={l.to}>
                <a href={l.to} className="hover:text-accent">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <NewsletterForm source="footer-en" locale="en" />
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 Burak Akçakanat — Psycho-Functional Analysis. All rights reserved.</span>
            <a href="/" hrefLang="tr" className="hover:text-accent">
              Türkçe
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

type NavItem = { to: string; label: string };

const MEASURE_LINKS: NavItem[] = [
  { to: "/degerlendirme", label: "PFA Ölçeği" },
  { to: "/7q", label: "7Q Profili" },
  { to: "/degerlendirme/mini", label: "Ücretsiz Ölçek" },
];

const WORKSPACE_LINKS: NavItem[] = [
  { to: "/seanslar", label: "Seanslar" },
  { to: "/webinarlar", label: "Webinarlar" },
  { to: "/egitim", label: "Eğitimler" },
];

const HEADER_NAV: (NavItem | { label: string; children: NavItem[] })[] = [
  { to: "/kitaplar", label: "Kitaplar" },
  { label: "Ölçme Araçları", children: MEASURE_LINKS },
  { label: "Çalışma Alanı", children: WORKSPACE_LINKS },
  { to: "/uygulayici-olun", label: "Uygulayıcı Programı" },
  { to: "/blog", label: "Blog" },
  { to: "/hakkinda", label: "Hakkında" },
];

const MOBILE_GROUPS: { label: string; links: NavItem[] }[] = [
  {
    label: "Keşfet",
    links: [
      { to: "/kitaplar", label: "Kitaplar" },
      { to: "/degerlendirme", label: "PFA Ölçeği" },
      { to: "/7q", label: "7Q Profili" },
      { to: "/degerlendirme/mini", label: "Ücretsiz Ölçek" },
      { to: "/blog", label: "Blog" },
    ],
  },
  {
    label: "Çalışma Alanı",
    links: [
      { to: "/seanslar", label: "Seanslar" },
      { to: "/webinarlar", label: "Webinarlar" },
      { to: "/egitim", label: "Eğitimler" },
    ],
  },
  {
    label: "Uygulayıcılar",
    links: [
      { to: "/uygulayicilar", label: "Uygulayıcı Bul" },
      { to: "/uygulayici-olun", label: "Uygulayıcı Programı" },
      { to: "/uygulayici-ekosistemi", label: "Uygulayıcı Ekosistemi" },
    ],
  },
  {
    label: "Kurumsal",
    links: [
      { to: "/hakkinda", label: "Hakkında" },
      { to: "/iletisim", label: "İletişim" },
    ],
  },
];

const FOOTER_DISCOVER: NavItem[] = [
  { to: "/kitaplar", label: "Kitaplar" },
  { to: "/degerlendirme", label: "PFA Ölçeği" },
  { to: "/7q", label: "7Q Profili" },
  { to: "/degerlendirme/mini", label: "Ücretsiz Ölçek" },
  { to: "/blog", label: "Blog" },
  { to: "/hakkinda", label: "Hakkında" },
  { to: "/iletisim", label: "İletişim" },
];

const FOOTER_MORE: NavItem[] = [
  { to: "/seanslar", label: "Seanslar" },
  { to: "/webinarlar", label: "Webinarlar" },
  { to: "/egitim", label: "Eğitim" },
  { to: "/uygulayicilar", label: "Uygulayıcı Bul" },
  { to: "/uygulayici-olun", label: "Uygulayıcı Programı" },
  { to: "/uygulayici-ekosistemi", label: "Uygulayıcı Ekosistemi" },
  { to: "/kullanim-kosullari", label: "Kullanım Koşulları" },
  { to: "/iade-politikasi", label: "İade Politikası" },
  { to: "/gizlilik", label: "Gizlilik" },
];

type MenuEntry = { label: string; to?: string; onClick?: () => void; node?: ReactNode };

function NavDropdown({
  label,
  links,
  triggerClassName,
  align = "left",
  hideChevron = false,
}: {
  label: string;
  links: MenuEntry[];
  triggerClassName?: string;
  align?: "left" | "right";
  hideChevron?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          "flex items-center gap-1 text-foreground/75 transition-colors hover:text-accent"
        }
      >
        {label}
        {!hideChevron && (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.8} />
        )}
      </button>
      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 flex w-44 flex-col rounded-md border border-border bg-background shadow-sm`}
        >
          {links.map((l, i) =>
            l.node ? (
              <div
                key={l.label}
                className={i < links.length - 1 ? "border-b border-border/60" : ""}
              >
                {l.node}
              </div>
            ) : l.to ? (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`px-4 py-2 text-sm hover:text-accent ${i < links.length - 1 ? "border-b border-border/60" : ""}`}
            >
              {l.label}
            </Link>
            ) : (
              <button
                key={l.label}
                type="button"
                onClick={() => { setOpen(false); l.onClick?.(); }}
                className={`px-4 py-2 text-left text-sm hover:text-accent ${i < links.length - 1 ? "border-b border-border/60" : ""}`}
              >
                {l.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const check = async (uid: string | undefined) => {
      if (!uid) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      setIsAdmin(!!data);
    };
    const loadName = async (uid: string | undefined) => {
      if (!uid) { setFullName(null); return; }
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      setFullName((data as { full_name?: string | null } | null)?.full_name?.trim() || null);
    };
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      check(data.user?.id);
      loadName(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      check(session?.user?.id);
      loadName(session?.user?.id);
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
        <nav className="hidden items-center gap-5 text-[0.82rem] tracking-wide lg:flex">
          {HEADER_NAV.map((item) =>
            "children" in item ? (
              <NavDropdown key={item.label} label={item.label} links={item.children} />
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="text-foreground/75 transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                {item.label}
              </Link>
            ),
          )}
          {email ? (
            <NavDropdown
              label={fullName ?? email.split("@")[0]}
              align="right"
              hideChevron
              triggerClassName="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs tracking-wide"
              links={[
                { to: "/hesabim", label: "Hesabım" },
                ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
                { label: "Çıkış", onClick: signOut },
              ]}
            />
          ) : (
            <Link to="/auth" className="rounded-md border border-accent px-3 py-1.5 text-xs tracking-wide text-accent hover:bg-accent hover:text-accent-foreground">
              Giriş Yap
            </Link>
          )}
          <LanguageSwitcher locale="tr" />
        </nav>
        <MobileMenu
          email={email}
          fullName={fullName}
          isAdmin={isAdmin}
          onSignOut={signOut}
        />
      </div>
    </header>
  );
}

function MobileMenu({
  email,
  fullName,
  isAdmin,
  onSignOut,
}: {
  email: string | null;
  fullName: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        className="rounded-md border border-border px-3 py-1.5 text-sm"
      >
        Menü
      </button>
      {open && (
        <div
          id="mobile-nav-menu"
          ref={menuRef}
          className="absolute right-4 mt-2 flex w-72 flex-col rounded-md border border-border bg-background shadow-sm"
        >
          <div className="border-b border-border/60 p-3">
            <Link
              to="/degerlendirme/mini"
              onClick={() => setOpen(false)}
              className="block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-foreground"
            >
              Ücretsiz Ölçek
            </Link>
          </div>
          {MOBILE_GROUPS.map((g) => (
            <div key={g.label} className="border-b border-border/60 py-2">
              <div className="px-4 pb-1 pt-1 text-xs tracking-[0.2em] text-muted-foreground">
                {g.label.toLocaleUpperCase("tr-TR")}
              </div>
              {g.links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block whitespace-nowrap px-4 py-2 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
          {email ? (
            <>
              <div className="border-b border-border/60 px-4 pb-1 pt-2 text-xs tracking-[0.2em] text-muted-foreground">
                {(fullName ?? email.split("@")[0]).toLocaleUpperCase("tr-TR")}
              </div>
              <Link to="/hesabim" className="border-b border-border/60 px-4 py-2.5 text-sm" onClick={() => setOpen(false)}>Hesabım</Link>
              {isAdmin && (<Link to="/admin" className="border-b border-border/60 px-4 py-2.5 text-sm" onClick={() => setOpen(false)}>Admin</Link>)}
              <button
                type="button"
                onClick={() => { setOpen(false); onSignOut(); }}
                className="px-4 py-2.5 text-left text-sm"
              >
                Çıkış
              </button>
            </>
          ) : (
            <Link to="/auth" className="px-4 py-2.5 text-sm text-accent" onClick={() => setOpen(false)}>Giriş Yap</Link>
          )}
          <a
            href="/en"
            hrefLang="en"
            className="border-t border-border/60 px-4 py-2.5 text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            English
          </a>
        </div>
      )}
    </div>
  );
}

function SiteFooter() {
  const [socials, setSocials] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["social_instagram", "social_linkedin", "social_x", "social_youtube"])
      .then(({ data }) => {
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
  ]
    .map((s) =>
      s.key === "social_instagram"
        ? { ...s, href: socials[s.key] || "https://www.instagram.com/psikofonksiyonelanaliz" }
        : { ...s, href: socials[s.key] },
    )
    .filter((s) => Boolean(s.href));
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
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
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
            {FOOTER_DISCOVER.map((l) => (
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
            {FOOTER_MORE.map((l) => (
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 Burak Akçakanat — Psiko-Fonksiyonel Analiz. Tüm hakları saklıdır.</span>
            <a href="/en" hrefLang="en" className="hover:text-accent">
              English
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

