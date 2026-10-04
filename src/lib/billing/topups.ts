// Horas extras (Fase 3 — docs/fase3-horas.md). Pacotes de 5, 10 e 20 h ao
// preço de billing_config.preco_recarga_por_hora (R$ 9,90/h), sem desconto.
// Fluxo: cria a recarga "pending" → cobrança avulsa no Asaas → o webhook
// confirma (process_topup_payment) e as horas entram no saldo do ciclo.
// Horas extras não usadas passam para o ciclo seguinte (horas_renovar_ciclo).
// Só servidor: grava com o cliente admin (o aluno só lê hour_topups).
import { createCustomer, createPayment } from "@/lib/asaas/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PACOTES_DE_HORAS_EXTRAS, PRECO_HORA_EXTRA_PADRAO, precoDoPacote } from "./horas";

export async function precoDaHoraExtra(): Promise<number> {
  const { data } = await createSupabaseAdminClient()
    .from("billing_config").select("valor").eq("chave", "preco_recarga_por_hora").maybeSingle();
  const preco = Number(data?.valor);
  return Number.isFinite(preco) && preco > 0 ? preco : PRECO_HORA_EXTRA_PADRAO;
}

export type ResultadoDaCompra = { ok: true; checkoutUrl: string } | { ok: false; erro: string };

export async function comprarHorasExtras(aluno: { id: string; email: string; nome: string }, horas: number): Promise<ResultadoDaCompra> {
  if (!(PACOTES_DE_HORAS_EXTRAS as readonly number[]).includes(horas)) {
    return { ok: false, erro: "Escolha um dos pacotes de horas." };
  }
  const db = createSupabaseAdminClient();
  const { data: assinatura } = await db.from("subscriptions")
    .select("id, asaas_customer_id")
    .eq("aluno_id", aluno.id).eq("status", "ativa")
    .order("criada_em", { ascending: false }).limit(1).maybeSingle();
  if (!assinatura) return { ok: false, erro: "Horas extras precisam de um plano ativo." };

  const precoPorHora = await precoDaHoraExtra();
  const valor = precoDoPacote(horas, precoPorHora);

  const { data: recarga, error } = await db.from("hour_topups").insert({
    aluno_id: aluno.id,
    subscription_id: assinatura.id,
    horas,
    valor,
    valor_unitario: precoPorHora,
    status: "pending",
  }).select("id").single();
  if (error || !recarga) {
    console.error("Falha ao criar recarga:", error?.message);
    return { ok: false, erro: "Não foi possível iniciar a compra agora." };
  }

  try {
    let customerId = assinatura.asaas_customer_id as string | null;
    if (!customerId) {
      customerId = (await createCustomer({ name: aluno.nome || "Aluno", email: aluno.email, externalReference: `soubilingue:aluno:${aluno.id}` })).id;
      await db.from("subscriptions").update({ asaas_customer_id: customerId }).eq("id", assinatura.id);
    }
    const pagamento = await createPayment({
      customerId,
      billingType: "UNDEFINED",
      value: valor,
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Sou Bilíngue - ${horas} horas extras de conversa`,
      externalReference: `soubilingue:topup:${recarga.id}`,
      callback: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.soubilingue.com.br"}/aluno/horas?compra=ok`,
        autoRedirect: true,
      },
    });
    await db.from("hour_topups").update({ asaas_invoice_id: pagamento.id }).eq("id", recarga.id);
    if (!pagamento.invoiceUrl) throw new Error("O Asaas não devolveu o link de pagamento");
    return { ok: true, checkoutUrl: pagamento.invoiceUrl };
  } catch (e) {
    console.error("Falha ao criar cobrança de horas extras:", e instanceof Error ? e.message : e);
    await db.from("hour_topups").update({ status: "expirada" }).eq("id", recarga.id);
    return { ok: false, erro: "Não foi possível gerar o pagamento agora. Tente de novo em instantes." };
  }
}
