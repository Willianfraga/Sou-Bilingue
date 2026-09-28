import { createSupabaseServerClient } from "@/lib/supabase/server";
import { planoTemVozPremium } from "@/lib/billing/planos";

// Qual voz o tutor usa depende do plano pago — regra em
// src/lib/billing/planos.ts (PLANOS_COM_VOZ_DO_NAVEGADOR).

// Nome do plano da assinatura ativa do aluno (cliente de sessão — RLS).
export async function getNomeDoPlanoAtivo(alunoId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plano:plano_id(nome)")
    .eq("aluno_id", alunoId)
    .eq("status", "ativa")
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const plano = (data as { plano: { nome: string } | { nome: string }[] | null }).plano;
  const unico = Array.isArray(plano) ? plano[0] : plano;
  return unico?.nome ?? null;
}

export async function alunoTemVozPremium(alunoId: string): Promise<boolean> {
  return planoTemVozPremium(await getNomeDoPlanoAtivo(alunoId));
}
