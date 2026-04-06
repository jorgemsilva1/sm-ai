"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { BusinessTag } from "@/lib/clients/business-tags";
import { copy, Locale } from "@/lib/i18n";

type BusinessTagPickerProps = {
  tags: BusinessTag[];
  selectedSlugs?: string[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  name?: string;
  locale: Locale;
};

export function BusinessTagPicker({
  tags,
  selectedSlugs = [],
  selectedTags,
  onTagsChange,
  name = "business_tags",
  locale,
}: BusinessTagPickerProps) {
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const isControlled = selectedTags !== undefined && onTagsChange !== undefined;
  const [internalSelected, setInternalSelected] = useState<string[]>(selectedSlugs);
  const selected = isControlled ? selectedTags : internalSelected;

  const filteredTags = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return tags;
    }
    return tags.filter((tag) => tag.label.toLowerCase().includes(term));
  }, [query, tags]);

  const toggleTag = (slug: string) => {
    const newSelected = selected.includes(slug)
      ? selected.filter((item) => item !== slug)
      : [...selected, slug];
    
    if (isControlled) {
      onTagsChange!(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  };

  const removeTag = (slug: string) => {
    const newSelected = selected.filter((item) => item !== slug);
    
    if (isControlled) {
      onTagsChange!(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="business-tags-search">{t.clients.tagsLabel}</Label>
      <input
        id="business-tags-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.clients.tagsSearch}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((slug) => {
            const tag = tags.find((item) => item.slug === slug);
            if (!tag) return null;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => removeTag(slug)}
                className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                {tag.label} ✕
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTags.map((tag) => {
          const id = `tag-${tag.slug}`;
          return (
            <label
              key={tag.slug}
              htmlFor={id}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm transition hover:border-border"
            >
              <input
                id={id}
                name={name}
                type="checkbox"
                value={tag.slug}
                checked={selected.includes(tag.slug)}
                onChange={() => toggleTag(tag.slug)}
                className="h-4 w-4 accent-brand"
              />
              <span>{tag.label}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t.clients.tagsHint}
      </p>
    </div>
  );
}
