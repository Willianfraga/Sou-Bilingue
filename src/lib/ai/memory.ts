import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemoriaDoAluno = { chave: string; valor: string };

const PADROES: Array<{ chave: string; regex: RegExp }> = [
  { chave: "localizacao", regex: /\b(?:eu\s+)?(?:moro|vivo)\s+em\s+([^.!?]{2,80})/i },
  { chave: "origem", regex: /\b(?:eu\s+)?sou\s+de\s+([^.!?]{2,80})/i },
  { chave: "interesses", regex: /\b(?:eu\s+)?(?:gosto|adoro|curto)\s+de\s+([^.!?]{2,120})/i },
  { chave: "profissao", regex: /\b(?:eu\s+)?(?:trabalho como|minha profissao e|minha profissão é)\s+(?:um\s+|uma\s+)?([^.!?]{2,80})/i },
  { chave: "idade", regex: /\b(?:eu\s+)?tenho\s+(\d{1,3})\s+anos\b/i },
  { chave: "objetivo_de_aprendizado", regex: /\b(?:eu\s+)?(?:quero|gostaria de)\s+aprender\s+([^.!?]{2,120})/i },
];

function extrairMemorias(texto: string): MemoriaDoAluno[] {
  return PADROES.flatMap(({ chave, regex }) => {
    const valor = texto.match(regex)?.[1]?.trim();
    return valor ? [{ chave, valor }] : [];
  });
}

export async function salvarMemoriasDaFala(alunoId: string, texto: string) {
  const memorias = extrairMemorias(texto);
  if (memorias.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("student_memories").upsert(
    memorias.map((memoria) => ({
      aluno_id: alunoId,
      chave: memoria.chave,
      valor: memoria.valor,
      atualizada_em: new Date().toISOString(),
    })),
    { onConflict: "aluno_id,chave" },
  );
  if (error) console.error("Falha ao salvar memória do aluno:", error.message);
}

export async function getMemoriasDoAluno(alunoId: string): Promise<MemoriaDoAluno[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_memories")
    .select("chave, valor")
    .eq("aluno_id", alunoId)
    .order("atualizada_em", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Falha ao recuperar memórias do aluno:", error.message);
    return [];
  }
  return data ?? [];
}

export function formatarMemorias(memorias: MemoriaDoAluno[]) {
  if (memorias.length === 0) return "Nenhuma informação pessoal adicional foi compartilhada ainda.";
  return memorias.map(({ chave, valor }) => `- ${chave.replaceAll("_", " ")}: ${valor}`).join("\n");
}
