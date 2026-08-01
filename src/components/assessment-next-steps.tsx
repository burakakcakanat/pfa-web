import { Link } from "@tanstack/react-router";
import { NewsletterForm } from "@/components/newsletter-form";

/**
 * Closing "how to continue" block for assessment results.
 * Intentionally identical for everyone — never conditioned on scores.
 */
export function AssessmentNextSteps() {
  return (
    <section className="mt-14">
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        Bu sonuç bir tanı değil; bugünkü durumunuza dair bir başlangıç fotoğrafıdır.
        Buradan nasıl devam etmek istediğinize kendiniz karar verin.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col rounded-lg border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">Bültene Katıl</div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">
            Ücretsiz. Yeni yazılar, ölçek ve webinar duyuruları e-posta ile gelir.
          </p>
          <div className="mt-4">
            <NewsletterForm variant="banner" source="assessment-result" />
          </div>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">Tam PFA Ölçeği + Rapor</div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">
            Genişletilmiş soru bankası, her seviye için ayrıntılı yorum ve zekâ türü skorları.
          </p>
          <Link to="/degerlendirme" className="mt-4 self-start text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-8 hover:text-accent">
            Ölçeği İncele →
          </Link>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-accent">Webinarlar ve Seanslar</div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">
            Haritayı birlikte çalışmak isterseniz webinarlara katılabilir veya birebir seans alabilirsiniz.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link to="/webinarlar" className="text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-8 hover:text-accent">
              Webinarlar →
            </Link>
            <Link to="/seanslar" className="text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-8 hover:text-accent">
              Seanslar →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
