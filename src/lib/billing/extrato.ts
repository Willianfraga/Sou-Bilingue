// Extrato de horas (usage_ledger, só lançamentos válidos — o histórico
// antigo inflado ficou marcado como inválido na migration 0025). Só servidor.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LancamentoDeHoras = {
  id: string;
  tipo: string;
  segundos: number;
  descricao: string | null;
  motivo: string | null;
  criada_em: string;
};

export async function extratoDeHoras(alunoId: string, limite = 50): Promise<LancamentoDeHoras[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("usage_ledger")
    .select("id, tipo, segundos, descricao, motivo, criada_em")
    .eq("aluno_id", alunoId)
    .eq("valido", true)
    .order("criada_em", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("Falha ao ler extrato de horas:", error.message);
    return [];
  }
  return (data ?? []) as LancamentoDeHoras[];
}
