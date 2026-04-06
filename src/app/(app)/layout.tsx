import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initials =
    user.email?.slice(0, 2).toUpperCase() || user.id.slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/20 glass">
        <div className="flex w-full items-center justify-between px-8 py-3">
          <div className="flex items-center gap-8">
            <Logo href="/dashboard" />
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/dashboard"
                className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-default hover:bg-foreground/5 hover:text-foreground"
              >
                {t.common.navOverview}
              </Link>
              <Link
                href="/dashboard/clients"
                className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-default hover:bg-foreground/5 hover:text-foreground"
              >
                {t.common.navClients}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle locale={locale} />
            <LanguageSwitcher locale={locale} />
            <div className="hidden items-center gap-3 md:flex">
              <span className="max-w-[160px] truncate text-sm text-muted-foreground">
                {user.email}
              </span>
              <Avatar className="h-8 w-8 ring-2 ring-border/30">
                <AvatarFallback className="gradient-brand text-sm font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                {t.common.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="w-full px-8 py-10">{children}</main>
    </div>
  );
}
