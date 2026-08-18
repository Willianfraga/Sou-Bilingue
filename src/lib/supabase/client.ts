"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente do browser. Só enxerga NEXT_PUBLIC_* — impossível vazar a service
// role key por aqui. Usar em componentes "use client".
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
