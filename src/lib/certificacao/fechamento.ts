import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { semanaCompleta } from "@/lib/types";

// § 05: o certificado de conclusão mensal só sai se TODAS as semanas do mês
// baterem 100% da cota — nenhuma pode ficar incompleta, e precisam existir
// as 4 semanas (senão o mês nem fechou de verdade ainda). 100% automático:
// isto roda como job (cliente admin), nunca a partir de uma ação de usuário.
export type ResultadoFechamento =
  | { status: "certificado_emitido"; codigoVerificacao: string }
  | { status: "ja_tinha_certificado" }
  | { status: "nao_elegivel"; motivo: string }
  | { status: "aluno_nao_encontrado" };

function gerarCodigoVerificacao(ano: number, mes: number): string {
  const sufixo = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SB-${ano}-${String(mes).padStart(2, "0")}-${sufixo}`;
}

export async function fecharMesDoAluno(
  alunoId: string,
  ano: number,
  mes: number,
): Promise<ResultadoFechamento> {
  const supabase = createSupabaseAdminClient();

  const { data: aluno } = await supabase
    .from("alunos")
    .select("idioma, plano")
    .eq("id", alunoId)
    .single();
  if (!aluno) return { status: "aluno_nao_encontrado" };

  const mesReferencia = `${ano}-${String(mes).padStart(2, "0")}-01`;

  // Já emitido? unique(aluno_id, mes_referencia) garante isso no banco, mas
  // checar antes evita gastar um código de verificação à toa.
  const { data: certificadoExistente } = await supabase
    .from("certificados")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();
  if (certificadoExistente) return { status: "ja_tinha_certificado" };

  const { data: semanas, error } = await supabase
    .from("cotas_semanais")
    .select("semana_numero, dias_cumpridos, dias_necessarios")
    .eq("aluno_id", alunoId)
    .eq("ano", ano)
    .eq("mes", mes);
  if (error) throw new Error(`Falha ao buscar cotas: ${error.message}`);

  if (!semanas || semanas.length < 4) {
    return {
      status: "nao_elegivel",
      motivo: `só ${semanas?.length ?? 0} de 4 semanas registradas`,
    };
  }

  const todasCompletas = semanas.every((s) =>
    semanaCompleta({
      numero: s.semana_numero,
      diasCumpridos: s.dias_cumpridos,
      diasNecessarios: s.dias_necessarios,
    }),
  );
  if (!todasCompletas) {
    return { status: "nao_elegivel", motivo: "nem toda semana bateu a cota" };
  }

  const codigoVerificacao = gerarCodigoVerificacao(ano, mes);
  const { error: erroInsercao } = await supabase.from("certificados").insert({
    aluno_id: alunoId,
    mes_referencia: mesReferencia,
    idioma: aluno.idioma,
    plano: aluno.plano,
    codigo_verificacao: codigoVerificacao,
  });
  if (erroInsercao) {
    // corrida rara com outra execução do job pro mesmo aluno/mês — o
    // unique constraint do banco é a trava real, isto aqui só evita erro feio
    if (erroInsercao.code === "23505") return { status: "ja_tinha_certificado" };
    throw new Error(`Falha ao emitir certificado: ${erroInsercao.message}`);
  }

  return { status: "certificado_emitido", codigoVerificacao };
}

// Roda pra todos os alunos de uma vez — é o que o job de verdade chama.
export async function fecharMesDeTodosOsAlunos(
  ano: number,
  mes: number,
): Promise<Array<{ alunoId: string; resultado: ResultadoFechamento }>> {
  const supabase = createSupabaseAdminClient();

  const { data: alunos, error } = await supabase.from("alunos").select("id");
  if (error) throw new Error(`Falha ao listar alunos: ${error.message}`);

  const resultados = [];
  for (const aluno of alunos ?? []) {
    const resultado = await fecharMesDoAluno(aluno.id, ano, mes);
    resultados.push({ alunoId: aluno.id, resultado });
  }
  return resultados;
}
