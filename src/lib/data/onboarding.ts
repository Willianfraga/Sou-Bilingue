import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SOTAQUES_POR_IDIOMA, type Idioma } from "@/lib/types";
import { VERSAO_QUESTIONARIO, etapaValida, type Respostas } from "@/lib/onboarding/questionario";

// Entrevista de boas-vindas — supabase/migrations/0013_aluno_onboarding.sql.
// Sempre com o cliente de sessão: o RLS garante que cada aluno só lê e grava
// a própria linha, mesmo que alguém passe outro id aqui por engano.

export type OnboardingDoAluno = {
  respostas: Respostas;
  rascunho: Respostas;
  etapaAtual: number;
  versao: number;
  concluidoEm: string | null;
  atualizadoEm: string;
};

export async function getOnboardingDoAluno(alunoId: string): Promise<OnboardingDoAluno | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aluno_onboarding")
    .select("respostas, rascunho, etapa_atual, versao_questionario, concluido_em, atualizado_em")
    .eq("aluno_id", alunoId)
    .maybeSingle();

  if (error) {
    console.error("Falha ao ler onboarding do aluno:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    respostas: (data.respostas ?? {}) as Respostas,
    rascunho: (data.rascunho ?? {}) as Respostas,
    etapaAtual: data.etapa_atual,
    versao: data.versao_questionario,
    concluidoEm: data.concluido_em,
    atualizadoEm: data.atualizado_em,
  };
}

// Upsert só com as colunas do rascunho: se o onboarding já foi concluído,
// as respostas confirmadas continuam intactas até o aluno confirmar de novo.
export async function salvarRascunhoDoOnboarding(alunoId: string, rascunho: Respostas, etapa: number) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("aluno_onboarding").upsert(
    {
      aluno_id: alunoId,
      rascunho,
      etapa_atual: etapaValida(etapa),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "aluno_id" },
  );
  if (error) {
    console.error("Falha ao salvar rascunho do onboarding:", error.message);
    return false;
  }
  return true;
}

// Confirma as respostas. A data de conclusão é a da primeira vez; edições
// posteriores só atualizam atualizado_em. Uma linha por aluno (PK), então
// refazer nunca duplica registro.
export async function concluirOnboarding(alunoId: string, respostas: Respostas) {
  const supabase = await createSupabaseServerClient();
  const atual = await getOnboardingDoAluno(alunoId);
  const agora = new Date().toISOString();

  const { error } = await supabase.from("aluno_onboarding").upsert(
    {
      aluno_id: alunoId,
      respostas,
      rascunho: {},
      etapa_atual: 0,
      versao_questionario: VERSAO_QUESTIONARIO,
      concluido_em: atual?.concluidoEm ?? agora,
      atualizado_em: agora,
    },
    { onConflict: "aluno_id" },
  );
  if (error) {
    console.error("Falha ao concluir onboarding:", error.message);
    return false;
  }
  return true;
}

// A pergunta "qual idioma" é a mesma escolha de alunos.idioma — mantém as duas
// coerentes. Mesmo caminho de src/app/aluno/idioma/actions.ts (service role,
// restrito ao id da sessão), porque alunos não tem policy de UPDATE.
export async function sincronizarIdiomaDoAluno(alunoId: string, idiomaAtual: Idioma, novo: Idioma) {
  if (novo === idiomaAtual) return true;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("alunos")
    .update({ idioma: novo, sotaque: SOTAQUES_POR_IDIOMA[novo][0] })
    .eq("id", alunoId);
  if (error) {
    console.error("Falha ao atualizar idioma do aluno:", error.message);
    return false;
  }
  return true;
}
