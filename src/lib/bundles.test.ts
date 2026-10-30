import { describe, it, expect } from "vitest";
import { resolveBundlePrice } from "./bundles";

const prices = {
  "danismanlik-oturumu": 15000,
  "tam-assessment-rapor": 4900,
  "bilinc-seviyeleri-calismalari": 14000,
  "pfa-ebook-tr": 1299,
  "hcd-ebook-en": 1299,
};
const b = (book_key: string, slugs: string[]) => ({
  discount_percent: 10,
  includes_book: true,
  book_key,
  items: slugs.map((product_slug) => ({ product_slug, quantity: 1 })),
});

describe("bundle price includes the book", () => {
  it("pfa-seans-kitap", () => expect(resolveBundlePrice(b("pfa", ["danismanlik-oturumu"]), prices)).toBe(14669));
  it("pfa-olcek-kitap", () => expect(resolveBundlePrice(b("pfa", ["tam-assessment-rapor"]), prices)).toBe(5579));
  it("pfa-olcek-seans-kitap", () =>
    expect(resolveBundlePrice(b("pfa", ["tam-assessment-rapor", "danismanlik-oturumu"]), prices)).toBe(19079));
  it("pfa-webinar-kitap", () => expect(resolveBundlePrice(b("pfa", ["bilinc-seviyeleri-calismalari"]), prices)).toBe(13769));
  it("hcd-seans-kitap", () => expect(resolveBundlePrice(b("hcd", ["danismanlik-oturumu"]), prices, "en")).toBe(14669));
});
