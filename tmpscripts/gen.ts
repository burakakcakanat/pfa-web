import { generatePersonalizedPdf } from "../src/lib/personalized-pdf.server";
const url = process.env.SUPABASE_URL!, key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const h = { apikey: key, Authorization: `Bearer ${key}` };
async function rest(p: string) { const r = await fetch(`${url}/rest/v1/${p}`, { headers: h }); return r.json(); }
async function dl(bucket: string, path: string) {
  const r = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { headers: h });
  if (!r.ok) return null; return new Uint8Array(await r.arrayBuffer());
}
const prod = await rest("products?slug=eq.pfa-ebook-tr&select=master_pdf_path,master_epub_path");
console.log("product:", prod);
const tpl = (await rest("ebook_dedication_templates?locale=eq.tr&select=*"))[0];
console.log("tpl signature_path:", tpl?.signature_path);
const master = await dl("book-files", prod[0].master_pdf_path);
console.log("master bytes:", master?.length);
const sig = tpl?.signature_path ? await dl("ebooks", tpl.signature_path) : null;
console.log("signature bytes:", sig?.length);
const bytes = await generatePersonalizedPdf({
  masterPdfBytes: master!, fullName: "Burak Akçakanat", email: "burakakcakanat@gmail.com",
  dedicationBody: tpl.body_template, footerTemplate: tpl.footer_template,
  authorName: tpl.author_name ?? "Burak Akçakanat", signatureBytes: sig,
  giftNote: null, buyerName: null, locale: "tr",
});
await Bun.write("/tmp/out.pdf", bytes);
console.log("OK pdf bytes:", bytes.length);
