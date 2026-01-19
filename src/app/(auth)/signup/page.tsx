"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy, getClientLocale } from "@/lib/i18n";

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, {});
  const locale = getClientLocale();
  const t = copy[locale];

  return (
    <Card className="w-full max-w-md border-border/40 bg-card/80 p-8 backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t.auth.signupTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.signupSubtitle}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {state?.error ? (
          <Alert variant="destructive">
            <AlertTitle>{t.common.errorTitle}</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <SubmitButton className="w-full bg-brand text-primary-foreground">
            {t.auth.createAccount}
          </SubmitButton>
        </form>

        <div className="text-sm text-muted-foreground">
          {t.auth.alreadyHaveAccount}{" "}
          <Link href="/login" className="hover:text-foreground">
            {t.auth.loginTitle}
          </Link>
        </div>
      </div>
    </Card>
  );
}
