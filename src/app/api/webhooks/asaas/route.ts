import { validateWebhookSignature } from "@/lib/asaas/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EventoAsaas = {
  id?: string;
  event?: string;
  payment?: { id?: string; value?: number; subscription?: string | { id?: string } };
};

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
  const { error: registroError } = await supabase.from("webhook_events").insert({
    provider: "asaas", event_id: evento.id, event_type: evento.event,
    payload: evento, status: "processando",
  });
  if (registroError?.code === "23505") {
    return Response.json({ success: true, duplicate: true });
  }
  if (registroError) return Response.json({ error: "Falha ao registrar evento" }, { status: 500 });

  try {
    const payment = evento.payment;
    const subscriptionId = typeof payment?.subscription === "string"
      ? payment.subscription : payment?.subscription?.id;
    const eventosPagamento = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED"];

    if (payment?.id && subscriptionId && eventosPagamento.includes(evento.event)) {
      const { data: subscription, error } = await supabase.from("subscriptions")
        .select("id, aluno_id, status").eq("asaas_subscription_id", subscriptionId).maybeSingle();
      if (error) throw error;
      if (!subscription) throw new Error(`Assinatura não encontrada: ${subscriptionId}`);

      const aprovado = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(evento.event);
      const { error: paymentError } = await supabase.from("payments").upsert({
        asaas_payment_id: payment.id, aluno_id: subscription.aluno_id,
        subscription_id: subscription.id, tipo: "assinatura", valor: payment.value ?? 0,
        status: aprovado ? "pago" : "recusado",
        data_pagamento: aprovado ? new Date().toISOString().slice(0, 10) : null,
      }, { onConflict: "asaas_payment_id" });
      if (paymentError) throw paymentError;

      if (aprovado && subscription.status !== "ativa") {
        const { error: activeError } = await supabase.from("subscriptions")
          .update({ status: "ativa", atualizada_em: new Date().toISOString() }).eq("id", subscription.id);
        if (activeError) throw activeError;
      }
    }

    const { error } = await supabase.from("webhook_events")
      .update({ status: "processado", processado_em: new Date().toISOString() })
      .eq("provider", "asaas").eq("event_id", evento.id);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
    await supabase.from("webhook_events").update({ status: "erro", process_error: mensagem })
      .eq("provider", "asaas").eq("event_id", evento.id);
    console.error("Falha ao processar webhook Asaas", error);
    return Response.json({ error: "Falha ao processar evento" }, { status: 500 });
  }
}
