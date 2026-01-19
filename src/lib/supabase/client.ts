"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseClientEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseClientEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis Supabase em falta. Define NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient(url, anonKey);
}
