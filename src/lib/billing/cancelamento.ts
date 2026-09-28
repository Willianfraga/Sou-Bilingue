import { cancelSubscription, deletePayment } from "@/lib/asaas/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcularAcessoAte, MOTIVOS_DE_CANCELAMENTO } from "@/lib/billing/regras-cancelamento";

export type ResultadoCancelamento =
  | { ok: true; acessoAte: string | null; jaEstavaCancelada: boolean }
  | { ok: false; erro: string };

// Cancelamento pedido pelo próprio aluno. alunoId sempre vem da sessão
// (server action). Service role porque subscriptions não tem policy de UPDATE
// para o aluno — toda consulta filtra por aluno_id.
//
// - Assinatura ativa: apaga a recorrente no Asaas (sem próximas cobranças) e
//   mantém o acesso até o fim do período pago.
// - Assinatura pendente (1ª mensalidade não paga): apaga a cobrança e encerra.
// Idempotente: pedir de novo não repete nada.
export async function cancelarAssinaturaDoAluno(alunoId: string, motivoBruto: unknown): Promise<ResultadoCancelamento> {
  const motivo = (MOTIVOS_DE_CANCELAMENTO as readonly string[]).includes(String(motivoBruto))
    ? String(motivoBruto)
    : "Não informado";
  const supabase = createSupabaseAdminClient();

  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("id, status, ciclo_fim, asaas_subscription_id, asaas_primeira_cobranca_id, cancelamento_solicitado_em, acesso_ate")
    .eq("aluno_id", alunoId)
    .in("status", ["ativa", "pendente"])
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Falha ao buscar assinatura para cancelar:", error.message);
    return { ok: false, erro: "Não foi possível cancelar agora. Tente de novo em instantes." };
  }
  if (!sub) return { ok: false, erro: "Você não tem assinatura ativa para cancelar." };
  if (sub.cancelamento_solicitado_em) return { ok: true, acessoAte: sub.acesso_ate, jaEstavaCancelada: true };

  const agora = new Date();
  try {
    if (sub.status === "pendente") {
      if (sub.asaas_primeira_cobranca_id) await ignorarNaoEncontrado(() => deletePayment(sub.asaas_primeira_cobranca_id!));
      if (sub.asaas_subscription_id) await ignorarNaoEncontrado(() => cancelSubscription(sub.asaas_subscription_id!));
      const { error: e } = await supabase
        .from("subscriptions")
        .update({ status: "cancelada", cancelada_em: agora.toISOString(), cancelamento_solicitado_em: agora.toISOString(), motivo_cancelamento: motivo })
        .eq("id", sub.id);
      if (e) throw new Error(e.message);
      return { ok: true, acessoAte: null, jaEstavaCancelada: false };
    }

    // Ativa: primeiro o Asaas (se falhar, nada muda no banco e o aluno pode
    // tentar de novo), depois o registro.
    if (sub.asaas_subscription_id) await ignorarNaoEncontrado(() => cancelSubscription(sub.asaas_subscription_id!));

    const { data: pago } = await supabase
      .from("payments")
      .select("data_pagamento")
      .eq("subscription_id", sub.id)
      .eq("status", "pago")
      .order("data_pagamento", { ascending: false })
      .limit(1)
      .maybeSingle();
    const acessoAte = calcularAcessoAte({ cicloFim: sub.ciclo_fim, ultimoPagamento: pago?.data_pagamento ?? null, hoje: agora });

    const { error: e } = await supabase
      .from("subscriptions")
      .update({ cancelamento_solicitado_em: agora.toISOString(), motivo_cancelamento: motivo, acesso_ate: acessoAte, atualizada_em: agora.toISOString() })
      .eq("id", sub.id);
    if (e) throw new Error(e.message);
    return { ok: true, acessoAte, jaEstavaCancelada: false };
  } catch (e) {
    console.error("Falha ao cancelar assinatura:", e instanceof Error ? e.message : "erro");
    return { ok: false, erro: "Não foi possível cancelar agora. Tente de novo em instantes ou fale com o suporte." };
  }
}

// Já removida no Asaas (404) conta como sucesso — deixa o cancelamento idempotente.
async function ignorarNaoEncontrado(chamada: () => Promise<unknown>) {
  try {
    await chamada();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/not_found|invalid_object|404|não encontrad/i.test(msg)) throw e;
  }
}
