"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy, getClientLocale } from "@/lib/i18n";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const locale = getClientLocale();
  const t = copy[locale];
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setHasSession(Boolean(data.session));
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t.auth.sessionError);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const password = String(formData.get("password") || "").trim();

    if (!password) {
      setError(t.auth.passwordRequired);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(t.auth.updateSuccess);
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md border-border/40 bg-card/80 p-8 backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t.auth.updateTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.updateSubtitle}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t.common.errorTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertTitle>{t.common.successTitle}</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {!ready ? (
          <Alert>
            <AlertTitle>{t.auth.validating}</AlertTitle>
            <AlertDescription>{t.auth.validatingBody}</AlertDescription>
          </Alert>
        ) : null}

        {ready && !hasSession ? (
          <Alert>
            <AlertTitle>{t.auth.invalidLink}</AlertTitle>
            <AlertDescription>
              {t.auth.invalidLinkBody}
            </AlertDescription>
          </Alert>
        ) : null}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.updatePasswordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={!ready || !hasSession}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-brand text-primary-foreground"
            disabled={loading || !ready || !hasSession}
          >
            {loading ? t.auth.updatePasswordLoading : t.auth.updatePassword}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    </Card>
  );
}
