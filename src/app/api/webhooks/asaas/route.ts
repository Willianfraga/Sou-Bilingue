import { validateWebhookSignature } from "@/lib/asaas/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { criarAssinaturaRecorrente } from "@/lib/billing/subscription";
import { registrarEventoFunil } from "@/lib/data/vendas";
import { planoDaCertificacao } from "@/lib/billing/planos";
import { aplicarEventoDeEstorno } from "@/lib/billing/reembolso";
import { statusDoEventoAsaas } from "@/lib/billing/regras-reembolso";

type EventoAsaas = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    value?: number;
    netValue?: number; // valor após a taxa do Asaas (confirmado pelo provedor)
    status?: string;
    billingType?: string;
    subscription?: string | { id?: string };
    externalReference?: string;
  };
};

// Campos do evento guardados em webhook_events (sem dados pessoais).
function resumoDoEvento(evento: EventoAsaas) {
  const p = evento.payment;
  return {
    id: evento.id,
    event: evento.event,
    payment: p
      ? {
          id: p.id,
          value: p.value,
          netValue: p.netValue,
          status: p.status,
          billingType: p.billingType,
          subscription: typeof p.subscription === "string" ? p.subscription : p.subscription?.id,
          externalReference: p.externalReference,
        }
      : undefined,
  };
}

// Grava o pagamento sem mexer no que já foi decidido: a data da 1ª
// confirmação é o início do prazo de 7 dias (reenvio não pode empurrá-la) e
// um pagamento estornado não volta a "pago". Devolve false se já estornado.
async function registrarPagamento(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  p: { asaasPaymentId: string; alunoId: string; subscriptionId: string; valor: number; valorLiquido?: number; aprovado: boolean },
) {
  const { data: atual, error: leituraError } = await supabase.from("payments")
    .select("status, data_pagamento").eq("asaas_payment_id", p.asaasPaymentId).maybeSingle();
  if (leituraError) throw leituraError;
  if (atual?.status === "estornado") return false;
  const { error } = await supabase.from("payments").upsert({
    asaas_payment_id: p.asaasPaymentId, aluno_id: p.alunoId,
    subscription_id: p.subscriptionId, tipo: "assinatura", valor: p.valor,
    status: p.aprovado ? "pago" : "recusado",
    data_pagamento: p.aprovado ? (atual?.data_pagamento ?? new Date().toISOString().slice(0, 10)) : null,
    ...(typeof p.valorLiquido === "number" ? { valor_liquido: p.valorLiquido } : {}),
  }, { onConflict: "asaas_payment_id" });
  if (error) throw error;
  return true;
}

// Pagamento confirmado da mensalidade abre um ciclo novo de horas (1ª
// mensalidade e cada renovação). O banco não repete para o mesmo pagamento.
async function renovarCicloDeHoras(supabase: ReturnType<typeof createSupabaseAdminClient>, subscriptionId: string, asaasPaymentId: string) {
  const { error } = await supabase.rpc("horas_renovar_ciclo", { p_sub: subscriptionId, p_pagamento: asaasPaymentId });
  if (error) throw error;
}

export async function POST(request: Request) {
  const token = request.headers.get("asaas-access-token") || undefined;
  if (!validateWebhookSignature(token)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  let evento: EventoAsaas;
  try {
    evento = (await request.json()) as EventoAsaas;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!evento.id || !evento.event) {
    return Response.json({ error: "Evento inválido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // Guarda só o que o processamento e a auditoria usam — o evento do Asaas
  // traz dados do comprador (nome, e-mail, CPF) que não precisam ficar aqui.
  const { error: registroError } = await supabase.from("webhook_events").insert({
    provider: "asaas", event_id: evento.id, event_type: evento.event,
    payload: resumoDoEvento(evento), status: "processando",
  });
  if (registroError?.code === "23505") {
    // Reenvio do mesmo evento. Já processado: responde ok sem repetir nada.
    // Falhou antes (ou travou em "processando" por mais de 5 min): reclama o
    // evento de forma atômica e processa de novo — o resto do fluxo é
    // idempotente (upsert por asaas_payment_id, checagem de status, etc.).
    const travadoAntesDe = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: reclamado, error: claimError } = await supabase.from("webhook_events")
      .update({ status: "processando", process_error: null, atualizado_em: new Date().toISOString() })
      .eq("provider", "asaas").eq("event_id", evento.id)
      .or(`status.eq.erro,and(status.eq.processando,atualizado_em.lt.${travadoAntesDe})`)
      .select("id, tentativas");
    if (claimError) return Response.json({ error: "Falha ao registrar evento" }, { status: 500 });
    if (!reclamado?.length) return Response.json({ success: true, duplicate: true });
    await supabase.from("webhook_events")
      .update({ tentativas: (reclamado[0].tentativas ?? 1) + 1 })
      .eq("id", reclamado[0].id);
  } else if (registroError) {
    return Response.json({ error: "Falha ao registrar evento" }, { status: 500 });
  }

  try {
    const payment = evento.payment;
    const subscriptionId = typeof payment?.subscription === "string"
      ? payment.subscription : payment?.subscription?.id;
    const eventosPagamento = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED"];

    const topupMatch = payment?.externalReference?.match(/^soubilingue:topup:([0-9a-f-]{36})$/i);
    if (payment?.id && topupMatch && eventosPagamento.includes(evento.event)) {
      const aprovado = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(evento.event);
      if (aprovado) {
        const { error } = await supabase.rpc("process_topup_payment", {
          p_topup_id: topupMatch[1],
          p_payment_id: payment.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hour_topups")
          .update({ status: evento.event === "PAYMENT_DELETED" ? "expirada" : "pending" })
          .eq("id", topupMatch[1]).eq("asaas_invoice_id", payment.id);
        if (error) throw error;
      }
    }

    // 1ª mensalidade com desconto (cobrança avulsa). Paga: libera o plano e só
    // então cria a assinatura recorrente, preço cheio, vencendo em um mês.
    const primeiraMatch = payment?.externalReference?.match(/^soubilingue:primeira:([0-9a-f-]{36})$/i);
    if (payment?.id && primeiraMatch && eventosPagamento.includes(evento.event)) {
      const { data: assinatura, error } = await supabase.from("subscriptions")
        .select("id, aluno_id, status, plano_id, asaas_customer_id, asaas_subscription_id, asaas_primeira_cobranca_id, planos(nome, preco)")
        .eq("id", primeiraMatch[1]).maybeSingle();
      if (error) throw error;
      if (!assinatura) throw new Error(`Assinatura não encontrada: ${primeiraMatch[1]}`);
      if (assinatura.asaas_primeira_cobranca_id !== payment.id) {
        throw new Error("Cobrança não corresponde à 1ª mensalidade registrada");
      }

      const aprovado = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(evento.event);
      const vigente = await registrarPagamento(supabase, {
        asaasPaymentId: payment.id, alunoId: assinatura.aluno_id,
        subscriptionId: assinatura.id, valor: payment.value ?? 0, valorLiquido: payment.netValue, aprovado,
      });

      if (aprovado && vigente) {
        await renovarCicloDeHoras(supabase, assinatura.id, payment.id);
        const plano = Array.isArray(assinatura.planos) ? assinatura.planos[0] : assinatura.planos;
        if (assinatura.status !== "ativa") {
          const { error: activeError } = await supabase.from("subscriptions")
            .update({ status: "ativa", atualizada_em: new Date().toISOString() }).eq("id", assinatura.id);
          if (activeError) throw activeError;
          // Plano pago → faixa da certificação (antes vinha da etapa "Plano"
          // do cadastro, que saiu no caminho curto).
          if (plano?.nome) {
            const { error: planoError } = await supabase.from("alunos")
              .update({ plano: planoDaCertificacao(plano.nome) }).eq("id", assinatura.aluno_id);
            if (planoError) throw planoError;
          }
          // Conversão só conta aqui, com o pagamento confirmado (uma vez por
          // assinatura: só na transição para "ativa").
          await registrarEventoFunil({ nome: "compra_confirmada", plano: plano?.nome, alunoId: assinatura.aluno_id });
        }
        // Idempotente: webhook repetido não cria segunda assinatura recorrente.
        if (!assinatura.asaas_subscription_id && plano && assinatura.asaas_customer_id) {
          const proximo = new Date();
          proximo.setMonth(proximo.getMonth() + 1);
          const recorrente = await criarAssinaturaRecorrente({
            alunoId: assinatura.aluno_id,
            planoId: assinatura.plano_id,
            nomePlano: plano.nome,
            preco: Number(plano.preco),
            customerId: assinatura.asaas_customer_id,
            primeiroVencimento: proximo,
          });
          const { error: recError } = await supabase.from("subscriptions")
            .update({ asaas_subscription_id: recorrente.id, atualizada_em: new Date().toISOString() })
            .eq("id", assinatura.id);
          if (recError) throw recError;
        }
      }
    }

    if (payment?.id && subscriptionId && eventosPagamento.includes(evento.event)) {
      const { data: subscription, error } = await supabase.from("subscriptions")
        .select("id, aluno_id, status").eq("asaas_subscription_id", subscriptionId).maybeSingle();
      if (error) throw error;
      if (!subscription) throw new Error(`Assinatura não encontrada: ${subscriptionId}`);

      const aprovado = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(evento.event);
      const vigente = await registrarPagamento(supabase, {
        asaasPaymentId: payment.id, alunoId: subscription.aluno_id,
        subscriptionId: subscription.id, valor: payment.value ?? 0, valorLiquido: payment.netValue, aprovado,
      });

      if (aprovado && vigente) await renovarCicloDeHoras(supabase, subscription.id, payment.id);
      if (aprovado && vigente && subscription.status !== "ativa") {
        const { error: activeError } = await supabase.from("subscriptions")
          .update({ status: "ativa", atualizada_em: new Date().toISOString() }).eq("id", subscription.id);
        if (activeError) throw activeError;
      }
    }

    // Estorno (pedido pelo app ou feito no painel do Asaas). Repetido ou fora
    // de ordem não faz o status voltar; confirmado encerra o acesso.
    if (payment?.id && statusDoEventoAsaas(evento.event)) {
      await aplicarEventoDeEstorno(payment.id, evento.event);
    }

    const { error } = await supabase.from("webhook_events")
      .update({ status: "processado", processado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
      .eq("provider", "asaas").eq("event_id", evento.id);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    // Só a mensagem: o objeto de erro do Asaas pode trazer dados do comprador.
    const mensagem = (error instanceof Error ? error.message : "Erro desconhecido").slice(0, 500);
    await supabase.from("webhook_events")
      .update({ status: "erro", process_error: mensagem, atualizado_em: new Date().toISOString() })
      .eq("provider", "asaas").eq("event_id", evento.id);
    console.error("Falha ao processar webhook Asaas:", evento.event, evento.id, mensagem);
    return Response.json({ error: "Falha ao processar evento" }, { status: 500 });
  }
}
