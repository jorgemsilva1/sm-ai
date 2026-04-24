"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

type ActionLocale = "en" | "pt";

const AUTH_COPY: Record<ActionLocale, Record<string, string>> = {
  en: {
    emailPasswordRequired: "Email and password are required.",
    emailRequired: "Email is required.",
    passwordRequired: "Password is required.",
    resetSuccess: "We sent an email to reset your password.",
  },
  pt: {
    emailPasswordRequired: "Preenche o email e a palavra-passe.",
    emailRequired: "Indica o email da conta.",
    passwordRequired: "A palavra-passe é obrigatória.",
    resetSuccess: "Enviámos um email para redefinir a palavra-passe.",
  },
};

function getActionLocale(formData: FormData): ActionLocale {
  const locale = String(formData.get("locale") || "").toLowerCase();
  return locale === "pt" ? "pt" : "en";
}

async function getOrigin() {
  const headerList = await headers();
  return headerList.get("origin") ?? "http://localhost:3000";
}

export async function signUp(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const locale = getActionLocale(formData);
  const t = AUTH_COPY[locale];

  if (!email || !password) {
    return { error: t.emailPasswordRequired };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?registered=1");
}

export async function signIn(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const locale = getActionLocale(formData);
  const t = AUTH_COPY[locale];

  if (!email || !password) {
    return { error: t.emailPasswordRequired };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  const locale = getActionLocale(formData);
  const t = AUTH_COPY[locale];

  if (!email) {
    return { error: t.emailRequired };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: t.resetSuccess };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
