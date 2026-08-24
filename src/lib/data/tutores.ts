import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tutor } from "@/lib/types";

// TEMPORÁRIO: usa o cliente admin (service role) porque ainda não existe
// autenticação real — a policy de RLS de "tutores" exige auth.uid() não
// nulo, e não há sessão pra satisfazer isso ainda. Trocar por
// createSupabaseServerClient() (cliente de sessão, RLS ativo) assim que o
// login existir — ver CLAUDE.md, pendência de auth.
export async function getTutores(): Promise<Tutor[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tutores")
    .select("id, nome, descricao, foto_url")
    .order("nome");

  if (error) {
    throw new Error(`Falha ao buscar tutores: ${error.message}`);
  }
  return data;
}

export async function getTutorPorId(id: string): Promise<Tutor | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tutores")
    .select("id, nome, descricao, foto_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar tutor ${id}: ${error.message}`);
  }
  return data;
}

// TEMPORÁRIO: src/lib/mock/perfil.ts ainda guarda um tutorId inventado
// ("tutor-clara") porque não existe cadastro de aluno de verdade ainda — o
// id real do tutor só existe depois que ele foi inserido no banco (uuid
// gerado pelo Postgres). Enquanto o perfil do aluno continuar mock, resolve
// o tutor por nome em vez de por id. Remove isso assim que o cadastro/login
// gravar um alunos.tutor_id de verdade.
export async function getTutorPorNome(nome: string): Promise<Tutor | null> {
  const tutores = await getTutores();
  return tutores.find((t) => t.nome === nome) ?? null;
}
