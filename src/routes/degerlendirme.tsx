import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/degerlendirme")({
  head: () => ({
    meta: [
      { title: "PA Ölçeği — Değerlendirme | PFA" },
      {
        name: "description",
        content:
          "PA Ölçeği: her bilinç seviyesi için 30 soru; farkındalığı işlevsel farkındalığa taşıyan değerlendirme aracı.",
      },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="container-page py-20">
      <header className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-accent">Değerlendirme</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">
          PA Ölçeği: Farkındalıktan İşlevsel Farkındalığa
        </h1>
        <p className="mt-8 text-base leading-relaxed text-foreground/80">
          Resiflerde dalış yapan herkes anda ve farkındadır; ama yalnızca bir deniz
          biyoloğu hangi canlının neden renk değiştirdiğini görür. Bu fark,
          farkındalık ile işlevsel farkındalık arasındaki farktır. PA Ölçeği bu
          geçişin aracıdır. Her bilinç seviyesi için 30 soru; hangi seviyede işlev
          aksadığını ve gelişimin nereden destek alacağını gösteren rapor. Bireysel
          gelişimden psikolojiye, eğitimden kurumsal seçme-yerleştirme-geliştirmeye
          uygulanabilir.
        </p>
      </header>

      <div className="mx-auto mt-16 max-w-2xl rounded-lg border border-border bg-card p-8 md:p-10">
        <h2 className="font-serif text-2xl">Ön Kayıt & Bilgi Talebi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ölçek erişimi ve rapor detayları için formu doldurun.
        </p>

        {sent ? (
          <div className="mt-8 rounded-md border border-accent/50 bg-accent/10 p-6 text-center">
            <div className="font-serif text-xl">Teşekkürler.</div>
            <p className="mt-2 text-sm text-foreground/80">
              Talebiniz alındı. En kısa sürede size dönüş yapacağız.
            </p>
          </div>
        ) : (
          <form
            className="mt-8 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Ad" name="firstName" required />
              <Field label="Soyad" name="lastName" required />
            </div>
            <Field label="E-posta" name="email" type="email" required />
            <Field label="Telefon (opsiyonel)" name="phone" type="tel" />
            <label className="grid gap-2 text-sm">
              <span className="text-foreground/80">
                Ölçeği hangi amaçla kullanmak istiyorsunuz?
              </span>
              <select
                required
                name="purpose"
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Seçiniz…
                </option>
                <option>Bireysel gelişim</option>
                <option>Terapötik çalışma</option>
                <option>Kurumsal gelişim</option>
                <option>Eğitim ve pedagoji</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-foreground/80">Mesaj</span>
              <textarea
                name="message"
                rows={4}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <button type="submit" className="btn-primary hover:btn-primary-hover justify-self-start">
              Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-foreground/80">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}