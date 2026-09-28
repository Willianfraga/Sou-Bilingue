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
    .select("id, papel")
    .eq("id", userId)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao consultar profile:", erroBusca.message);
    return false;
  }

  if (!existente) {
    const { error } = await supabase
      .from("profiles")
      .insert({ id: userId, papel: "aluno", nome });

    if (error) {
      console.error("Erro ao criar profile do aluno:", error.message);
      return false;
    }
  } else if (existente.papel !== "aluno") {
    return true;
  }

  return garantirAluno(userId);
}

// Valores iniciais do aluno, criados já no cadastro (caminho curto até o
// pagamento — 27 set 2026). Idioma e objetivo são confirmados na entrevista
// de boas-vindas (que sincroniza alunos.idioma); o tutor pode ser trocado na
// tela da aula; o plano é atualizado quando o pagamento é confirmado.
export const TUTOR_INICIAL = "e315b919-9faf-4ebb-a786-db46a676c01e"; // Clara (0011)

export async function garantirAluno(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("alunos").upsert(
    {
      id: userId,
      responsavel_id: null,
      maior_de_idade: true,
      idioma: "ingles",
      sotaque: "Americano",
      plano: "basico",
      tutor_id: TUTOR_INICIAL,
      objetivo_pessoal: "",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("Erro ao criar aluno:", error.message);
    return false;
  }
  return true;
}
