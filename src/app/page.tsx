import Link from "next/link";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

export default async function Home() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  return (
    <div className="min-h-screen bg-tech">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher locale={locale} />
          <Button asChild variant="ghost">
            <Link href="/login">{t.home.signIn}</Link>
          </Button>
          <Button asChild className="bg-brand text-primary-foreground">
            <Link href="/signup">{t.home.createAccount}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-muted">
              {t.home.heroTagline}
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              {t.home.heroTitle}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t.home.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-brand text-primary-foreground">
                <Link href="/signup">{t.home.heroPrimary}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">{t.home.heroSecondary}</Link>
              </Button>
            </div>
          </div>

          <Card className="relative overflow-hidden border border-border/40 bg-card/70 p-6 backdrop-blur">
            <div className="space-y-5">
              <div className="rounded-lg border border-border/40 bg-background/80 p-4">
                <p className="text-sm text-muted-foreground">
                  {t.home.previewClient}
                </p>
                <p className="text-lg font-semibold">
                  {t.home.previewClientName}
                </p>
                <Separator className="my-3" />
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span>{t.home.previewClientArea}</span>
                  <span>{t.home.previewClientRefs}</span>
                  <span>{t.home.previewClientTone}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/80 p-4">
                <p className="text-sm text-muted-foreground">
                  {t.home.previewPlanning}
                </p>
                <p className="text-lg font-semibold">
                  {t.home.previewPlanningWeek}
                </p>
                <Separator className="my-3" />
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <span>{t.home.previewPlanningGoal}</span>
                  <span>{t.home.previewPlanningFormat}</span>
                  <span>{t.home.previewPlanningCta}</span>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 border-grid opacity-40" />
          </Card>
        </section>
      </main>
    </div>
  );
}
