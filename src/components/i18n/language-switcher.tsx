"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Locale } from "@/lib/i18n";

type LanguageSwitcherProps = {
  locale: Locale;
};

const LABELS: Record<Locale, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "English" },
  pt: { flag: "🇵🇹", label: "Português" },
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (next: Locale) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <span>{LABELS[locale].flag}</span>
          <span className="hidden text-xs font-medium md:inline">
            {LABELS[locale].label}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          {(["en", "pt"] as const).map((lang) => (
            <DropdownMenuRadioItem key={lang} value={lang}>
              <span>{LABELS[lang].flag}</span>
              <span className="ml-2">{LABELS[lang].label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
