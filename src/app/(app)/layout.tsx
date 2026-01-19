import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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
      <header className="border-b border-border/40 bg-card/60 backdrop-blur">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
              <Link href="/dashboard" className="hover:text-foreground">
                {t.common.navOverview}
              </Link>
              <Link href="/dashboard/clients" className="hover:text-foreground">
                {t.common.navClients}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {user.email}
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                {t.common.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="w-full px-6 py-8">{children}</main>
    </div>
  );
}
