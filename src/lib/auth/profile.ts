import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function nomeValido(nome: string) {
  return nome.length >= 2 && nome.length <= 120;
}

// Cria o profile de aluno do usuário se ainda não existir. Idempotente.
// Não há policy de INSERT em profiles; a escrita passa pelo service role,
// sempre restrita ao userId que o chamador tirou da sessão — nunca do corpo
// da requisição. O papel é fixo em "aluno": o metadata do signUp é editável
// pelo próprio usuário, então não decide papel nenhum.
export async function garantirProfileAluno(userId: string, nome: string) {
  const supabase = createSupabaseAdminClient();

  const { data: existente, error: erroBusca } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao consultar profile:", erroBusca.message);
    return false;
  }

  if (existente) {
    return true;
  }

  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId, papel: "aluno", nome });

  if (error) {
    console.error("Erro ao criar profile do aluno:", error.message);
    return false;
  }

  return true;
}
