// Server-only: kişiselleştirilmiş PDF üretimi (imzalı nüsha).
// pdf-lib + fontkit ile Latin Extended (Türkçe ğ, ı, ş, İ) destekli TTF gömer.
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Fontlar öncelikle Storage'dan (ebooks/fonts/*) okunur; ağ erişimi
// gerekmez ve CDN yol değişikliklerine karşı dayanıklıdır. Yedek olarak
// Google Fonts deposundaki değişken TTF'ler indirilir.
const FONT_FALLBACK_URLS = {
  regular: "https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora%5Bwght%5D.ttf",
  italic: "https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora-Italic%5Bwght%5D.ttf",
} as const;

const FONT_STORAGE_PATHS = {
  regular: "fonts/Lora-Regular.ttf",
  italic: "fonts/Lora-Italic.ttf",
} as const;

let cachedRegular: ArrayBuffer | null = null;
let cachedItalic: ArrayBuffer | null = null;

async function loadFont(
  variant: "regular" | "italic",
  cached: ArrayBuffer | null,
): Promise<ArrayBuffer> {
  if (cached) return cached;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("ebooks").download(FONT_STORAGE_PATHS[variant]);
    if (data) {
      const buf = await data.arrayBuffer();
      if (buf.byteLength > 10000) return buf;
    }
  } catch {
    /* Storage okunamazsa CDN yedeğine geç */
  }
  const res = await fetch(FONT_FALLBACK_URLS[variant]);
  if (!res.ok) throw new Error(`Font yüklenemedi (${variant}, ${res.status})`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 10000) throw new Error(`Font dosyası geçersiz (${variant})`);
  return buf;
}

export type PersonalizeInput = {
  masterPdfBytes: Uint8Array;
  fullName: string;
  email: string;
  dedicationBody: string; // {{FULL_NAME}} yer tutucusu içerebilir
  footerTemplate: string; // {{EMAIL}} yer tutucusu içerebilir
  authorName: string;
  signatureBytes?: Uint8Array | null;
  giftNote?: string | null;
  buyerName?: string | null;
  locale: "tr" | "en";
};

export async function generatePersonalizedPdf(input: PersonalizeInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input.masterPdfBytes);
  pdf.registerFontkit(fontkit);

  cachedRegular = await loadFont("regular", cachedRegular);
  cachedItalic = await loadFont("italic", cachedItalic);

  const regular = await pdf.embedFont(cachedRegular);
  const italic = await pdf.embedFont(cachedItalic);

  // Kapak sayfasından hemen sonra dedication ekle.
  const first = pdf.getPage(0);
  const { width, height } = first.getSize();
  const ded = pdf.insertPage(1, [width, height]);

  // Fildişi zemin.
  ded.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.985, 0.976, 0.945),
  });

  // İnce üst ve alt aksant çizgileri.
  const gold = rgb(0.72, 0.58, 0.24);
  const teal = rgb(0.12, 0.28, 0.32);
  ded.drawLine({
    start: { x: width * 0.35, y: height * 0.82 },
    end: { x: width * 0.65, y: height * 0.82 },
    thickness: 0.75,
    color: gold,
  });

  const centerX = width / 2;
  const bodyText = input.dedicationBody.replace(/\{\{FULL_NAME\}\}/g, input.fullName);
  const lines = bodyText.split(/\r?\n/);
  const bodySize = 16;
  const lineH = bodySize * 1.7;
  const topY = height * 0.72;

  lines.forEach((line, i) => {
    const w = italic.widthOfTextAtSize(line, bodySize);
    ded.drawText(line, {
      x: centerX - w / 2,
      y: topY - i * lineH,
      size: bodySize,
      font: italic,
      color: teal,
    });
  });

  let cursorY = topY - lines.length * lineH - 36;

  // Hediye notu (varsa).
  if (input.giftNote && input.giftNote.trim()) {
    const buyer = input.buyerName ? ` — ${input.buyerName}` : "";
    const noteText = `“${input.giftNote.trim()}”${buyer}`;
    const noteSize = 12;
    const wN = regular.widthOfTextAtSize(noteText, noteSize);
    ded.drawText(noteText, {
      x: centerX - wN / 2,
      y: cursorY,
      size: noteSize,
      font: regular,
      color: rgb(0.32, 0.36, 0.36),
    });
    cursorY -= 32;
  }

  // İmza görseli.
  if (input.signatureBytes && input.signatureBytes.byteLength > 0) {
    try {
      const sig = await pdf.embedPng(input.signatureBytes);
      const targetW = Math.min(180, width * 0.38);
      const scale = targetW / sig.width;
      const h = sig.height * scale;
      ded.drawImage(sig, {
        x: centerX - targetW / 2,
        y: cursorY - h,
        width: targetW,
        height: h,
      });
      cursorY -= h + 10;
    } catch {
      /* imza gömülemezse sessizce atla */
    }
  }

  // Yazar + tarih.
  const dateStr = new Date().toLocaleDateString(
    input.locale === "tr" ? "tr-TR" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const authorLine = `${input.authorName} — ${dateStr}`;
  const authorSize = 12;
  const wA = regular.widthOfTextAtSize(authorLine, authorSize);
  ded.drawText(authorLine, {
    x: centerX - wA / 2,
    y: cursorY - 8,
    size: authorSize,
    font: regular,
    color: teal,
  });

  // Alt aksant çizgisi.
  ded.drawLine({
    start: { x: width * 0.35, y: cursorY - 30 },
    end: { x: width * 0.65, y: cursorY - 30 },
    thickness: 0.75,
    color: gold,
  });

  // Tüm sayfalara footer (dedication dahil).
  const footer = input.footerTemplate
    .replace(/\{\{EMAIL\}\}/g, input.email)
    .replace(/\{\{FULL_NAME\}\}/g, input.fullName);
  const footerSize = 8;
  const pages = pdf.getPages();
  for (const p of pages) {
    const { width: pw } = p.getSize();
    const wF = regular.widthOfTextAtSize(footer, footerSize);
    p.drawText(footer, {
      x: (pw - wF) / 2,
      y: 18,
      size: footerSize,
      font: regular,
      color: rgb(0.6, 0.62, 0.62),
    });
  }

  return await pdf.save();
}