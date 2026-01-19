"use client";

import { useMemo, useTransition } from "react";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Link2Off,
  Linkedin,
  ShieldCheck,
  Twitter,
  Youtube,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { copy, type Locale } from "@/lib/i18n";
import { disconnectClientSocialAccount } from "@/app/(app)/dashboard/clients/actions";

type Provider = "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "x";

export type ClientSocialAccount = {
  id: string;
  provider: Provider | string;
  provider_account_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  created_at: string;
};

const PROVIDERS: Array<{ key: Provider; title: string; hint: string }> = [
  { key: "instagram", title: "Instagram (Meta)", hint: "Instagram Graph API via Meta OAuth." },
  { key: "facebook", title: "Facebook Pages (Meta)", hint: "Facebook Graph API via Meta OAuth." },
  { key: "tiktok", title: "TikTok", hint: "TikTok for Developers OAuth 2.0 (PKCE)." },
  { key: "linkedin", title: "LinkedIn", hint: "LinkedIn OAuth 2.0 (OpenID scopes)." },
  { key: "youtube", title: "YouTube (Google)", hint: "Google OAuth 2.0 + YouTube scopes." },
  { key: "x", title: "X (Twitter)", hint: "X OAuth 2.0 (PKCE)." },
];

function ProviderLogo({ provider }: { provider: Provider }) {
  const cls = "h-4 w-4";
  switch (provider) {
    case "instagram":
      return <Instagram className={`${cls} text-pink-500`} />;
    case "facebook":
      return <Facebook className={`${cls} text-blue-500`} />;
    case "tiktok":
      return <Music2 className={`${cls} text-foreground`} />;
    case "linkedin":
      return <Linkedin className={`${cls} text-sky-600`} />;
    case "youtube":
      return <Youtube className={`${cls} text-red-500`} />;
    case "x":
      return <Twitter className={`${cls} text-foreground`} />;
  }
}

function providerLabel(locale: Locale, p: Provider) {
  if (locale === "pt") {
    if (p === "youtube") return "YouTube (Google)";
    if (p === "x") return "X (Twitter)";
    if (p === "facebook") return "Facebook Pages (Meta)";
    if (p === "instagram") return "Instagram (Meta)";
    if (p === "tiktok") return "TikTok";
    if (p === "linkedin") return "LinkedIn";
  }
  return PROVIDERS.find((x) => x.key === p)?.title ?? p;
}

export function ClientIntegrations({
  locale,
  clientId,
  accounts,
}: {
  locale: Locale;
  clientId: string;
  accounts: ClientSocialAccount[];
}) {
  const t = copy[locale];
  const [isPending, startTransition] = useTransition();

  const byProvider = useMemo(() => {
    const map = new Map<string, ClientSocialAccount[]>();
    for (const a of accounts) {
      const key = String(a.provider || "").toLowerCase();
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return map;
  }, [accounts]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((p) => {
        const connected = byProvider.get(p.key) ?? [];
        const startHref = `/api/oauth/${p.key}/start?clientId=${encodeURIComponent(clientId)}`;

        return (
          <Card key={p.key} className="border-border/40 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/40 bg-background/60">
                  <ProviderLogo provider={p.key} />
                </span>
                {providerLabel(locale, p.key)}
              </CardTitle>
              <CardDescription>
                {locale === "pt"
                  ? "Conecta a tua conta via OAuth. As permissões dependem do provider (ver docs)."
                  : "Connect your account via OAuth. Permissions depend on provider (see docs)."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {connected.length ? (
                <div className="space-y-2">
                  {connected.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">
                            {a.display_name || a.username || a.provider_account_id || a.id}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {locale === "pt" ? "Scopes:" : "Scopes:"}{" "}
                          {(a.scopes ?? []).slice(0, 6).join(", ") || "-"}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {a.profile_url ? (
                          <Button asChild type="button" variant="outline" size="sm">
                            <a href={a.profile_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await disconnectClientSocialAccount(clientId, a.id, locale);
                            })
                          }
                          className="gap-2"
                        >
                          <Link2Off className="h-4 w-4" />
                          {locale === "pt" ? "Desconectar" : "Disconnect"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-border/40 bg-background/40 p-3 text-sm text-muted-foreground">
                  {locale === "pt" ? "Ainda não há contas conectadas." : "No connected accounts yet."}
                </div>
              )}
            </CardContent>

            <CardFooter className="justify-between gap-2 border-t border-border/40">
              <a
                className="text-xs text-muted-foreground underline"
                href="/dashboard/docs/integrations"
                target="_blank"
                rel="noreferrer"
              >
                {locale === "pt" ? "Docs de OAuth & pedidos" : "OAuth & app review docs"}
              </a>
              <Button asChild type="button" className="bg-brand text-primary-foreground" disabled={isPending}>
                <a href={startHref}>
                  {connected.length ? (locale === "pt" ? "Adicionar conta" : "Add account") : locale === "pt" ? "Conectar" : "Connect"}
                </a>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

