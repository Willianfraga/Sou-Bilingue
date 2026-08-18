import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PerfilDoAluno } from "@/lib/types";

// alunos.id === profiles.id === auth user id (1:1) — ver
// supabase/migrations/0001_schema_inicial.sql. Cliente de sessão — RLS
// decide se quem está logado pode ver o perfil desse aluno.
export async function getPerfilDoAluno(
  alunoId: string,
): Promise<PerfilDoAluno | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("alunos")
    .select("idioma, sotaque, plano, tutor_id, objetivo_pessoal")
    .eq("id", alunoId)
    .single();

  if (error || !data) return null;

  return {
    idioma: data.idioma,
    sotaque: data.sotaque,
    plano: data.plano,
    tutorId: data.tutor_id,
    objetivoPessoal: data.objetivo_pessoal,
  };
}

// § 03: interface do responsável só existe quando o aluno é menor —
// responsavel_id aponta pra quem consentiu (profiles.id). Assume um aluno
// por responsável por enquanto (schema permite mais de um; MVP não precisa).
export async function getAlunoDoResponsavel(
  responsavelId: string,
): Promise<{ id: string; nome: string } | null> {
  const supabase = await createSupabaseServerClient();

  const { data: aluno, error } = await supabase
    .from("alunos")
    .select("id")
    .eq("responsavel_id", responsavelId)
    .limit(1)
    .maybeSingle();
  if (error || !aluno) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", aluno.id)
    .single();

  return { id: aluno.id, nome: profile?.nome ?? "Aluno" };
}
