import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BUSINESS_TAGS } from "@/lib/clients/business-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientProfileForm } from "@/components/clients/client-profile-form";
import { ClientTagsForm } from "@/components/clients/client-tags-form";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, website, description, photo_url, notes")
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("client_profiles")
    .select("audience, tone, references_text, goals, brand_values")
    .eq("client_id", id)
    .maybeSingle();

  const { data: tagData } = await supabase
    .from("client_business_tags")
    .select("business_tags(slug)")
    .eq("client_id", id);

  const selectedTags =
    tagData
      ?.map((row) => {
        const bt = row.business_tags;
        if (Array.isArray(bt)) return bt[0]?.slug;
        return (bt as { slug: string } | null)?.slug;
      })
      .filter((slug): slug is string => Boolean(slug)) ?? [];

  const tagLabels = selectedTags
    .map((slug) => BUSINESS_TAGS.find((tag) => tag.slug === slug)?.label)
    .filter((label): label is string => Boolean(label));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 shadow-md ring-2 ring-border/20">
            {client.photo_url ? <AvatarImage src={client.photo_url} alt={client.name} /> : null}
            <AvatarFallback className="bg-surface-2 text-lg font-bold">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{t.clients.subtitle}</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/clients">
            {t.common.backToClients}
          </Link>
        </Button>
      </div>

      {tagLabels.length ? (
        <div className="flex flex-wrap gap-2">
          {tagLabels.map((label) => (
            <Badge key={label} variant="secondary" className="border-border/20 bg-surface-2 text-muted-foreground">
              {label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ClientTagsForm
          clientId={client.id}
          locale={locale}
          businessTags={BUSINESS_TAGS}
          selectedTags={selectedTags}
        />
        <ClientProfileForm
          clientId={client.id}
          locale={locale}
          defaultValues={{
            audience: profile?.audience ?? null,
            tone: profile?.tone ?? null,
            references_text: profile?.references_text ?? null,
            goals: profile?.goals ?? null,
            brand_values: profile?.brand_values ?? null,
          }}
        />
      </div>
    </div>
  );
}
