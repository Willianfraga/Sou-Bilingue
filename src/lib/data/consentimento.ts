import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ConsentimentoLgpd = {
  responsavelNome: string;
  alunoNome: string;
  consentidoEm: string;
};

// § 02: consentimento LGPD (Art. 14) obrigatório antes de liberar o cadastro
// do menor. Cliente de sessão — RLS decide se quem está logado pode ver.
export async function getConsentimento(
  alunoId: string,
): Promise<ConsentimentoLgpd | null> {
  const supabase = await createSupabaseServerClient();

  const { data: consentimento, error } = await supabase
    .from("consentimentos_lgpd")
    .select("responsavel_id, consentido_em")
    .eq("aluno_id", alunoId)
    .is("revogado_em", null)
    .order("consentido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !consentimento) return null;

  const { data: responsavel } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", consentimento.responsavel_id)
    .single();

  const { data: aluno } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", alunoId)
    .single();

  return {
    responsavelNome: responsavel?.nome ?? "—",
    alunoNome: aluno?.nome ?? "—",
    consentidoEm: consentimento.consentido_em.slice(0, 10),
  };
}
