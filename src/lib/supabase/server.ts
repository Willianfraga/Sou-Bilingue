import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para Server Components / Route Handlers. Usa a ANON KEY +
// sessão do usuário — toda query passa por RLS. É o cliente padrão; só usar
// o admin (server-side, service role) quando houver motivo explícito.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components não podem escrever cookies; o middleware
            // (quando existir) renova a sessão — ignorar aqui é seguro.
          }
        },
      },
    },
  );
}
