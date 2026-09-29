import { BarChart3, BellRing, Wallet } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { siteText } from "@/lib/data/site";

const perkIcons = [Wallet, BellRing, BarChart3];

/** "Untuk toko" section — texts from the CMS (Admin → CMS Situs). */
export async function StoreCta() {
  const t = await siteText();
  const perks = perkIcons.map((icon, i) => ({ icon, title: t(`store_cta.perk${i + 1}.title`), body: t(`store_cta.perk${i + 1}.body`) }));
  const highlight = t("store_cta.title_highlight");
  return (
    <section className="bg-violet-50 py-24 dark:bg-violet-950/20 sm:py-32">
      <Container>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <SectionLabel>{t("store_cta.label")}</SectionLabel>
            <h2 className="display-2 mt-5 text-text">
              {t("store_cta.title")}
              {highlight && (
                <>
                  {" "}
                  <span className="text-primary">{highlight}</span>
                </>
              )}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
              {t("store_cta.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:pb-2">
            <Button href="/sell" variant="primary" size="lg">
              {t("store_cta.button_primary")}
            </Button>
            <Button href="/help/cara-membuka-toko" variant="secondary" size="lg">
              {t("store_cta.button_secondary")}
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {perks.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-8"
            >
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-lg font-semibold text-text">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
