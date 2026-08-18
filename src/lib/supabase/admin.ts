import { createClient } from "@supabase/supabase-js";

// Cliente com SERVICE ROLE — IGNORA RLS.
//
// ⚠️ Use apenas em: webhooks (Asaas), jobs do motor de certificação, e
// resgate de link público de cadastro. Toda função que usar este cliente é
// responsável por filtrar aluno_id/responsavel_id na mão — RLS não ajuda
// aqui. Nunca importe este módulo em código com "use client".
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient não pode rodar no browser");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
