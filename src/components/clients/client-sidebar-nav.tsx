"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Book,
  BookOpen,
  CalendarDays,
  Swords,
  FileText,
  Image,
  LayoutGrid,
  Plug,
  ScrollText,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copy, Locale } from "@/lib/i18n";

type ClientSidebarNavProps = {
  clientId: string;
  locale: Locale;
};

const sections = [
  {
    group: "editorial",
    items: [
      {
        key: "editorial",
        path: "",
        icon: FileText,
      },
      {
        key: "references",
        path: "references",
        icon: BookOpen,
      },
      {
        key: "competitors",
        path: "competitors",
        icon: Swords,
      },
      {
        key: "deep-thinking",
        path: "deep-thinking",
        icon: Brain,
      },
      {
        key: "personas",
        path: "personas",
        icon: Users,
      },
      {
        key: "strategy",
        path: "strategy",
        icon: Target,
      },
    ],
  },
  {
    group: "contentOps",
    items: [
      {
        key: "calendar",
        path: "calendar",
        icon: CalendarDays,
      },
      {
        key: "media",
        path: "media",
        icon: Image,
      },
      {
        key: "feed",
        path: "feed",
        icon: LayoutGrid,
      },
      {
        key: "budget",
        path: "budget",
        icon: Wallet,
      },
      {
        key: "audiences",
        path: "audiences",
        icon: Users,
      },
    ],
  },
  {
    group: "insightsTools",
    items: [
      {
        key: "suggestions",
        path: "suggestions",
        icon: Sparkles,
      },
      {
        key: "api-docs",
        path: "api-docs",
        icon: Book,
      },
      {
        key: "logs",
        path: "logs",
        icon: ScrollText,
      },
      {
        key: "integrations",
        path: "integrations",
        icon: Plug,
      },
      {
        key: "settings",
        path: "settings",
        icon: Settings,
      },
    ],
  },
] as const;

export function ClientSidebarNav({ clientId, locale }: ClientSidebarNavProps) {
  const pathname = usePathname();
  const t = copy[locale].clientNav;

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.group} className="space-y-1">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
            {section.group === "editorial" && t.editorial}
            {section.group === "contentOps" && t.contentOps}
            {section.group === "insightsTools" && t.insightsTools}
          </div>
          <nav className="space-y-0.5">
            {section.items.map((item) => {
              const href = `/dashboard/clients/${clientId}/${item.path}`;
              const isActive =
                item.path === ""
                  ? pathname === `/dashboard/clients/${clientId}`
                  : pathname?.startsWith(href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-default",
                    isActive
                      ? "bg-brand/10 font-medium text-brand shadow-sm"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-brand")} />
                  <span>
                    {item.key === "editorial" && t.items.editorial}
                    {item.key === "references" && t.items.references}
                    {item.key === "competitors" && t.items.competitors}
                    {item.key === "deep-thinking" && t.items.deepThinking}
                    {item.key === "personas" && t.items.personas}
                    {item.key === "strategy" && t.items.strategy}
                    {item.key === "calendar" && t.items.calendar}
                    {item.key === "media" && t.items.media}
                    {item.key === "feed" && t.items.feed}
                    {item.key === "budget" && t.items.budget}
                    {item.key === "audiences" && t.items.audiences}
                    {item.key === "suggestions" && t.items.suggestions}
                    {item.key === "api-docs" && t.items.apiDocs}
                    {item.key === "logs" && t.items.logs}
                    {item.key === "integrations" && t.items.integrations}
                    {item.key === "settings" && t.items.settings}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="my-3 border-b border-border/20" />
        </div>
      ))}
    </div>
  );
}
