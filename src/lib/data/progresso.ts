import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProgressoDoMes } from "@/lib/types";

function nomeDoMes(ano: number, mes: number): string {
  const data = new Date(ano, mes - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Cliente de sessão (não admin) — RLS decide sozinho se quem está logado
// pode ver a cota desse aluno (app.pode_ver_aluno). § 05: cota não acumula,
// então só olhamos o mês corrente.
export async function getProgressoDoMes(
  alunoId: string,
): Promise<ProgressoDoMes | null> {
  const supabase = await createSupabaseServerClient();

  const { data: aluno, error: erroAluno } = await supabase
    .from("alunos")
    .select("plano")
    .eq("id", alunoId)
    .single();
  if (erroAluno || !aluno) return null;

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;

  const { data: semanas, error } = await supabase
    .from("cotas_semanais")
    .select("semana_numero, dias_necessarios, dias_cumpridos")
    .eq("aluno_id", alunoId)
    .eq("ano", ano)
    .eq("mes", mes)
    .order("semana_numero");

  if (error) {
    throw new Error(`Falha ao buscar progresso do mês: ${error.message}`);
  }

  return {
    mesReferencia: nomeDoMes(ano, mes),
    plano: aluno.plano,
    semanas: (semanas ?? []).map((s) => ({
      numero: s.semana_numero,
      diasCumpridos: s.dias_cumpridos,
      diasNecessarios: s.dias_necessarios,
    })),
  };
}
