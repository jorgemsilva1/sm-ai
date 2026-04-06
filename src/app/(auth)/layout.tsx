import { Logo } from "@/components/branding/logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  return (
    <div className="relative min-h-screen bg-tech">
      <div className="absolute inset-0 border-grid opacity-50" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle locale={locale} />
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
