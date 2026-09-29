import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "./auditoria";
import { validarEdicaoTutor, type StatusTutor } from "./tutores-regras";

export { ROTULO_STATUS_TUTOR, STATUS_TUTOR, validarEdicaoTutor, type StatusTutor } from "./tutores-regras";

// Área Tutores do painel (migration 0023). Métricas por tutor contam desde
// 29/09/2026 (quando o consumo passou a guardar o tutor). O prompt é o mesmo
// para todos (src/lib/ai/tutor.ts); versões por tutor no banco = Fase E.

export type MetricaTutor = {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  faixa_etaria: string | null;
  genero: string | null;
  status: StatusTutor;
  atualizado_em: string | null;
  atualizado_por: string | null;
  alunos_atuais: number;
  alunos_atendidos: number;
  conversas: number;
  mensagens: number;
  chamadas: number;
  erros: number;
  latencia_media_ms: number | null;
  tokens_entrada: number;
  tokens_saida: number;
  custo_usd: number;
};

export async function metricasDosTutores(de: Date, ate: Date): Promise<MetricaTutor[]> {
  const { data, error } = await createSupabaseAdminClient().rpc("admin_tutores_metricas", { p_de: de.toISOString(), p_ate: ate.toISOString() });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MetricaTutor[]).map((t) => ({ ...t, custo_usd: Number(t.custo_usd) }));
}

export async function atualizarTutor(adminId: string, id: string, entrada: { nome: unknown; descricao: unknown; status: unknown; motivo: unknown }) {
  const v = validarEdicaoTutor(entrada);
  if (!v.ok) return v;
  const db = createSupabaseAdminClient();
  const { data: antes } = await db.from("tutores").select("nome, descricao, status, ativo").eq("id", id).maybeSingle();
  if (!antes) return { ok: false as const, erro: "Tutor não encontrado." };
  const depois = { ...v.dados, ativo: v.dados.status === "ativo", atualizado_em: new Date().toISOString(), atualizado_por: adminId };
  const { error } = await db.from("tutores").update(depois).eq("id", id);
  await registrarAuditoria({
    adminId,
    acao: "tutor.editar",
    entidade: "tutor",
    entidadeId: id,
    antes,
    depois: v.dados,
    motivo: v.motivo,
    resultado: error ? "erro" : "ok",
  });
  return error ? { ok: false as const, erro: "Não foi possível salvar agora." } : { ok: true as const };
}
