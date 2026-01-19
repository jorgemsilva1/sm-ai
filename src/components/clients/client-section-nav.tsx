"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ClientSectionNavProps = {
  clientId: string;
  active: "configuracoes" | "budget" | "calendar" | "media" | "social";
};

const sections = [
  { key: "configuracoes", label: "Configurações", path: "" },
  { key: "budget", label: "Budget", path: "budget" },
  { key: "calendar", label: "Calendar", path: "calendar" },
  { key: "media", label: "Media", path: "media" },
  {
    key: "social",
    label: "Social Media Platforms",
    path: "social-media-platforms",
  },
] as const;

export function ClientSectionNav({ clientId, active }: ClientSectionNavProps) {
  return (
    <div className="border-b border-border/40 pb-4">
      <nav className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {sections.map((section) => (
          <Link
            key={section.key}
            href={`/dashboard/clients/${clientId}/${section.path}`}
            className={cn(
              "rounded-md px-3 py-2 transition hover:bg-muted/60 hover:text-foreground",
              active === section.key && "bg-muted/60 text-foreground"
            )}
          >
            {section.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
