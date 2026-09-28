import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Depoimento } from "@/lib/vendas/conteudo";

// Depoimentos dos alunos — supabase/migrations/0017_cancelamento_e_depoimentos.sql.
// Aluno e admin usam o cliente de sessão (RLS decide). Só a página de vendas
// lê com service role, e só os campos públicos dos aprovados.

export type MeuDepoimento = { nome_exibicao: string; contexto: string; texto: string; status: string } | null;

export async function getMeuDepoimento(alunoId: string): Promise<MeuDepoimento> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("depoimentos")
    .select("nome_exibicao, contexto, texto, status")
    .eq("aluno_id", alunoId)
    .maybeSingle();
  return data ?? null;
}

export async function enviarDepoimento(alunoId: string, dados: { nome_exibicao: string; contexto: string; texto: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("depoimentos").insert({
    aluno_id: alunoId,
    ...dados,
    autorizou_publicacao: true,
    autorizado_em: new Date().toISOString(),
    status: "pendente",
  });
  if (error) console.error("Falha ao enviar depoimento:", error.message);
  return !error;
}

// Retirar a autorização tira o depoimento da página na hora.
export async function retirarDepoimento(alunoId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("depoimentos").update({ status: "retirado" }).eq("aluno_id", alunoId);
  if (error) console.error("Falha ao retirar depoimento:", error.message);
  return !error;
}

export type DepoimentoParaModerar = {
  id: string;
  nome_exibicao: string;
  contexto: string;
  texto: string;
  status: string;
  criado_em: string;
};

export async function getDepoimentosParaModeracao(): Promise<DepoimentoParaModerar[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("depoimentos")
    .select("id, nome_exibicao, contexto, texto, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) console.error("Falha ao listar depoimentos:", error.message);
  return data ?? [];
}

export async function moderarDepoimento(id: string, status: "aprovado" | "recusado", adminId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("depoimentos")
    .update({ status, moderado_em: new Date().toISOString(), moderado_por: adminId })
    .eq("id", id)
    .neq("status", "retirado"); // autorização retirada pelo aluno não volta
  if (error) console.error("Falha ao moderar depoimento:", error.message);
  return !error;
}

export async function getDepoimentosPublicados(): Promise<Depoimento[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("depoimentos")
    .select("nome_exibicao, contexto, texto")
    .eq("status", "aprovado")
    .eq("autorizou_publicacao", true)
    .order("moderado_em", { ascending: false })
    .limit(9);
  if (error) {
    console.error("Falha ao ler depoimentos publicados:", error.message);
    return [];
  }
  return (data ?? []).map((d) => ({ nome: d.nome_exibicao, contexto: d.contexto, texto: d.texto }));
}
