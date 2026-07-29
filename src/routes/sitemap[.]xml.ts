import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://psychofunctionalanalysis.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/kitaplar", changefreq: "weekly", priority: "0.9" },
          { path: "/degerlendirme", changefreq: "monthly", priority: "0.9" },
          { path: "/seanslar", changefreq: "monthly", priority: "0.8" },
          { path: "/webinarlar", changefreq: "monthly", priority: "0.8" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/hakkinda", changefreq: "yearly", priority: "0.6" },
          { path: "/iletisim", changefreq: "yearly", priority: "0.5" },
          { path: "/uygulayici-olun", changefreq: "monthly", priority: "0.7" },
          { path: "/kullanim-kosullari", changefreq: "yearly", priority: "0.3" },
          { path: "/iade-politikasi", changefreq: "yearly", priority: "0.3" },
        ];

        let dynamicEntries: SitemapEntry[] = [];
        try {
          const sb = publicClient();
          const { data } = await sb
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("published", true);
          dynamicEntries = (data ?? []).map((p) => ({
            path: `/blog/${p.slug}`,
            lastmod: p.updated_at,
            changefreq: "monthly" as const,
            priority: "0.7",
          }));
        } catch {
          // fall through with static-only sitemap
        }

        const entries = [...staticEntries, ...dynamicEntries];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});