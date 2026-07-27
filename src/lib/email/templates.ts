// Shared minimal branded PFA email template — cream bg, serif heading,
// gold rule, small footer. Escapes all interpolated user content.

export function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type RenderOptions = {
  title: string;
  bodyHtml: string; // trusted / pre-escaped
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
  unsubscribeUrl?: string;
};

export function renderEmail(opts: RenderOptions): string {
  const cta =
    opts.ctaLabel && opts.ctaHref
      ? `<div style="margin:28px 0;text-align:center">
          <a href="${esc(opts.ctaHref)}" style="display:inline-block;background:#0F4C4C;color:#F7F3EA;padding:12px 26px;border-radius:6px;text-decoration:none;font-family:Inter,system-ui,sans-serif;font-size:14px;letter-spacing:.02em">${esc(opts.ctaLabel)}</a>
         </div>`
      : "";
  const unsub = opts.unsubscribeUrl
    ? `<br/><a href="${esc(opts.unsubscribeUrl)}" style="color:#6b6355;text-decoration:underline">Abonelikten ayrıl</a>`
    : "";
  const footer = opts.footerNote ? `<div style="margin-top:12px">${opts.footerNote}</div>` : "";
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#F7F3EA;font-family:Inter,system-ui,-apple-system,sans-serif;color:#1a2a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EA;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDF7;border:1px solid #E6DFCF;border-radius:8px;overflow:hidden">
        <tr><td style="padding:24px 32px;text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:15px;letter-spacing:.24em;color:#0F4C4C">PFA — PSİKO-FONKSİYONEL ANALİZ</td></tr>
        <tr><td style="padding:0 32px"><div style="height:2px;background:linear-gradient(90deg,transparent,#C9A96A,transparent)"></div></td></tr>
        <tr><td style="padding:28px 32px 8px;font-family:'EB Garamond',Georgia,serif;font-size:22px;color:#1F4E52">${esc(opts.title)}</td></tr>
        <tr><td style="padding:8px 32px 24px;font-size:15px;line-height:1.7;color:#2a3a3e">${opts.bodyHtml}${cta}</td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #EEE5D0;font-size:11px;color:#6b6355;text-align:center">
          Psiko-Fonksiyonel Analiz · psychofunctionalanalysis.com${footer}${unsub}
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

// Minimal, safe markdown → HTML for newsletter bodies.
export function mdToHtml(md: string): string {
  const lines = String(md ?? "").split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const inline = (s: string) =>
    s
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0F4C4C">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(esc(line.replace(/^\s*[-*]\s+/, "")))}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!line.trim()) { out.push(""); continue; }
    if (/^###\s+/.test(line)) { out.push(`<h3 style="font-family:'EB Garamond',Georgia,serif;color:#1F4E52">${inline(esc(line.replace(/^###\s+/, "")))}</h3>`); continue; }
    if (/^##\s+/.test(line)) { out.push(`<h2 style="font-family:'EB Garamond',Georgia,serif;color:#1F4E52">${inline(esc(line.replace(/^##\s+/, "")))}</h2>`); continue; }
    if (/^#\s+/.test(line)) { out.push(`<h1 style="font-family:'EB Garamond',Georgia,serif;color:#1F4E52">${inline(esc(line.replace(/^#\s+/, "")))}</h1>`); continue; }
    out.push(`<p>${inline(esc(line))}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}