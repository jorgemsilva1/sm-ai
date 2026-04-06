"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { copy, type Locale } from "@/lib/i18n";

type ThemeToggleProps = {
  locale: Locale;
};

const ICONS: Record<"light" | "dark" | "system", React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({ locale }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = copy[locale];

  const Icon = ICONS[theme === "system" ? "system" : resolvedTheme];

  const options: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: "system", label: t.common.themeSystem, icon: Monitor },
    { value: "light", label: t.common.themeLight, icon: Sun },
    { value: "dark", label: t.common.themeDark, icon: Moon },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1 text-sm text-muted-foreground transition-default hover:bg-muted/60 hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as Theme)}
        >
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              <opt.icon className="mr-2 h-3.5 w-3.5" />
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
