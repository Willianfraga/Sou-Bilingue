/**
 * Webhook do Asaas para processamento de pagamentos
 * URL configurada: https://seu-dominio.com/api/webhooks/asaas
 *
 * Eventos:
 * - payment.confirmed (pagamento confirmado)
 * - payment.failed (pagamento recusado)
 * - payment.refunded (pagamento reembolsado)
 * - subscription.renewed (assinatura renovada)
 * - subscription.cancelled (assinatura cancelada)
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateWebhookSignature } from "@/lib/asaas/client";
import { renewSubscription } from "@/lib/billing/subscription";

export async function POST(request: Request) {
  try {
    // 1. Validar assinatura do webhook
    const body = await request.text();
    const signature = request.headers.get("x-webhook-signature") || undefined;

    if (!validateWebhookSignature(body, signature)) {
      console.warn("Webhook signature inválida");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = JSON.parse(body);
    const { event, payment, subscription } = data;

    console.log(`[Webhook Asaas] Evento recebido:`, event);

    const supabase = await createSupabaseServerClient();

    // ========================================================================
    // 2. PAYMENT.CONFIRMED — Pagamento aprovado
    // ========================================================================
    if (event === "payment.confirmed") {
      const paymentId = payment?.id;
      const customerId = payment?.customer?.id;
      const value = payment?.value;
      const subscriptionId = payment?.subscription?.id;

      if (!paymentId) {
        return Response.json({ error: "Payment ID required" }, { status: 400 });
      }

      // Buscar subscription no banco por asaas_subscription_id
      const { data: dbSub, error: subError } = await supabase
        .from("subscriptions")
        .select("id, aluno_id, status")
        .eq("asaas_subscription_id", subscriptionId)
        .single();

      if (subError || !dbSub) {
        console.error("Subscription não encontrada no banco:", subscriptionId);
        // Mesmo assim retornar 200 para não fazer retry infinito
        return Response.json({
          success: true,
          message: "Webhook processado (subscription não encontrada)",
        });
      }

      // Registrar pagamento
      const { error: paymentError } = await supabase
        .from("payments")
        .upsert({
          asaas_payment_id: paymentId,
          aluno_id: dbSub.aluno_id,
          subscription_id: dbSub.id,
          tipo: "assinatura",
          valor: value,
          status: "pago",
          data_pagamento: new Date().toISOString().split("T")[0],
        });

      if (paymentError) {
        console.error("Erro ao registrar pagamento:", paymentError);
      }

      // Garantir que assinatura está ativa
      if (dbSub.status !== "ativa") {
        await supabase
          .from("subscriptions")
          .update({ status: "ativa" })
          .eq("id", dbSub.id);
      }

      console.log(`[Webhook] Pagamento confirmado: ${paymentId}`);
      return Response.json({ success: true });
    }

    // ========================================================================
    // 3. PAYMENT.FAILED — Pagamento recusado
    // ========================================================================
    if (event === "payment.failed") {
      const paymentId = payment?.id;
      const customerId = payment?.customer?.id;

      // Registrar tentativa falhada
      const { data: dbSub } = await supabase
        .from("subscriptions")
        .select("id, aluno_id")
        .eq("asaas_subscription_id", payment?.subscription?.id)
        .single();

      if (dbSub) {
        await supabase.from("payments").upsert({
          asaas_payment_id: paymentId,
          aluno_id: dbSub.aluno_id,
          subscription_id: dbSub.id,
          tipo: "assinatura",
          valor: payment?.value,
          status: "recusado",
        });

        // TODO: Enviar email ao aluno notificando falha de pagamento
      }

      console.log(`[Webhook] Pagamento recusado: ${paymentId}`);
      return Response.json({ success: true });
    }

    // ========================================================================
    // 4. SUBSCRIPTION.RENEWED — Assinatura renovada automaticamente
    // ========================================================================
    if (event === "subscription.renewed") {
      const subscriptionId = subscription?.id;

      // Buscar subscription no banco
      const { data: dbSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("asaas_subscription_id", subscriptionId)
        .single();

      if (dbSub) {
        const result = await renewSubscription(dbSub.id);
        if (!result.success) {
          console.error("Erro ao renovar subscription:", result.error);
        }
      }

      console.log(`[Webhook] Assinatura renovada: ${subscriptionId}`);
      return Response.json({ success: true });
    }

    // ========================================================================
    // 5. SUBSCRIPTION.CANCELLED — Assinatura cancelada
    // ========================================================================
    if (event === "subscription.cancelled") {
      const subscriptionId = subscription?.id;

      const { data: dbSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("asaas_subscription_id", subscriptionId)
        .single();

      if (dbSub) {
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelada",
            cancelada_em: new Date().toISOString(),
          })
          .eq("id", dbSub.id);
      }

      console.log(`[Webhook] Assinatura cancelada: ${subscriptionId}`);
      return Response.json({ success: true });
    }

    // ========================================================================
    // Evento não reconhecido
    // ========================================================================
    console.warn(`Evento não tratado: ${event}`);
    return Response.json({ success: true, message: "Evento ignorado" });
  } catch (error) {
    console.error("[Webhook] Erro ao processar:", error);
    // Retornar 200 mesmo em erro para não fazer retry infinito
    return Response.json(
      { error: "Erro ao processar webhook" },
      { status: 200 }
    );
  }
}
