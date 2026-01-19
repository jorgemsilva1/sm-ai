"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type EntityContextMenuItem =
  | {
      type?: "item";
      key: string;
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      variant?: "default" | "destructive";
    }
  | { type: "separator"; key: string };

export function EntityContextMenu({
  items,
  ariaLabel = "Ações",
  align = "end",
}: {
  items: EntityContextMenuItem[];
  ariaLabel?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={ariaLabel}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item) => {
          if (item.type === "separator") {
            return <DropdownMenuSeparator key={item.key} />;
          }

          return (
            <DropdownMenuItem
              key={item.key}
              disabled={item.disabled}
              variant={item.variant}
              onSelect={(event) => {
                event.preventDefault();
                item.onSelect();
              }}
            >
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

