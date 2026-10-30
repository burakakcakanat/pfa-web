import { describe, it, expect } from "vitest";
import { waitlistDiscountCents } from "./waitlist";

const base = { productSlug: "pfa-ebook-tr", hasActiveWaitlist: true, pct: 10, hasAddons: false };

describe("waitlist book discount", () => {
  it("10% off the current book price", () => expect(waitlistDiscountCents(1299, base)).toBe(130));
  it("uses the price on payment day (new price → new discount)", () =>
    expect(waitlistDiscountCents(1499, base)).toBe(150));
  it("no waitlist entry → no discount", () =>
    expect(waitlistDiscountCents(1299, { ...base, hasActiveWaitlist: false })).toBe(0));
  it("only books get it", () =>
    expect(waitlistDiscountCents(15000, { ...base, productSlug: "danismanlik-oturumu" })).toBe(0));
  it("not stacked onto packages", () => expect(waitlistDiscountCents(1299, { ...base, hasAddons: true })).toBe(0));
});
