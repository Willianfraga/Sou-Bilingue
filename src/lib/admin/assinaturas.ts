import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Assinaturas reais (tabela subscriptions). Substitui a leitura da tabela
// legada "assinaturas", que mostrava dados de teste antigos. Paginação no
// servidor e nomes em uma consulta só (sem N+1).

export const STATUS_ASSINATURA = ["ativa", "pendente", "cancelada", "pausada"] as const;

export type LinhaAssinatura = {
  id: string;
  aluno_id: string;
  nomeAluno: string;
  plano: string | null;
  preco: number | null;
  status: string;
  criada_em: string;
  proxima_renovacao: string | null;
  cancelamento_solicitado_em: string | null;
  acesso_ate: string | null;
  motivo_cancelamento: string | null;
  asaas: boolean;
};

export async function listarAssinaturas(f: { pagina: number; porPagina: number; status?: string }) {
  const db = createSupabaseAdminClient();
  let q = db
    .from("subscriptions")
    .select("id, aluno_id, status, criada_em, proxima_renovacao, cancelamento_solicitado_em, acesso_ate, motivo_cancelamento, asaas_subscription_id, planos(nome, preco)", { count: "exact" })
    .order("criada_em", { ascending: false });
  if (f.status && (STATUS_ASSINATURA as readonly string[]).includes(f.status)) q = q.eq("status", f.status);
  const inicio = (f.pagina - 1) * f.porPagina;
  const { data, count, error } = await q.range(inicio, inicio + f.porPagina - 1);
  if (error) throw new Error(error.message);

  const ids = [...new Set((data ?? []).map((s) => s.aluno_id))];
  const { data: perfis } = ids.length ? await db.from("profiles").select("id, nome").in("id", ids) : { data: [] };
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome as string]));

  const linhas: LinhaAssinatura[] = (data ?? []).map((s) => {
    const plano = Array.isArray(s.planos) ? s.planos[0] : s.planos;
    return {
      id: s.id,
      aluno_id: s.aluno_id,
      nomeAluno: nomes.get(s.aluno_id) ?? "—",
      plano: plano?.nome ?? null,
      preco: plano?.preco != null ? Number(plano.preco) : null,
      status: s.status,
      criada_em: s.criada_em,
      proxima_renovacao: s.proxima_renovacao,
      cancelamento_solicitado_em: s.cancelamento_solicitado_em,
      acesso_ate: s.acesso_ate,
      motivo_cancelamento: s.motivo_cancelamento,
      asaas: Boolean(s.asaas_subscription_id),
    };
  });
  return { linhas, total: count ?? 0 };
}
