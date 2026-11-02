import { describe, expect, it } from 'vitest';
import { transferTotal, validReceipt, RECEIPT_MAX_BYTES } from './transfer-pricing';
const prices = { 'pfa-ebook-tr': { try: 59400, usd: 1299 }, 'danismanlik-oturumu': { try: 762600, usd: 15000 } };
describe('Transfer money rules', () => {
  it('takes 10% off a current single book price', () => { expect(transferTotal(prices,'pfa-ebook-tr',null,'tr',true,10)?.totalCents).toBe(53460); });
  it('uses the new price rather than the registration price', () => { expect(transferTotal({'pfa-ebook-tr':{try:100000}},'pfa-ebook-tr',null,'tr',true,10)?.totalCents).toBe(90000); });
  it('never discounts a session with book waitlist eligibility', () => { expect(transferTotal(prices,'danismanlik-oturumu',null,'tr',true,10)?.discountCents).toBe(0); });
  it('includes the book in a package and never stacks the waitlist discount', () => { const b={items:[{product_slug:'danismanlik-oturumu',quantity:1}],includes_book:true,book_key:'pfa',discount_percent:10}; expect(transferTotal(prices,'pfa-ebook-tr',b,'tr',true,10)).toEqual({subtotalCents:739800,discountCents:0,totalCents:739800,currency:'try'}); });
  it('does not pretend a USD fallback is TRY', () => { expect(transferTotal({'pfa-ebook-tr':{usd:1299}},'pfa-ebook-tr',null,'tr',false,10)).toBeNull(); });
  it('does not discount customers without waitlist eligibility',()=>{expect(transferTotal(prices,'pfa-ebook-tr',null,'tr',false,10)?.discountCents).toBe(0);});
});
describe('Private receipts',()=>{it('limits receipts to 5MB',()=>{expect(validReceipt(RECEIPT_MAX_BYTES+1,'application/pdf')).toBe(false);expect(validReceipt(RECEIPT_MAX_BYTES,'application/pdf')).toBe(true);});it('allows PDF PNG JPEG only',()=>{expect(validReceipt(100,'text/html')).toBe(false);expect(validReceipt(100,'image/png')).toBe(true);expect(validReceipt(100,'image/jpeg')).toBe(true);});});