import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServerEnv } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseServerEnv();

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis Supabase em falta. Define SUPABASE_URL e SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignora em Server Components; middleware já mantém a sessão.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignora em Server Components; middleware já mantém a sessão.
        }
      },
    },
  });
}
