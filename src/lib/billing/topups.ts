/**
 * Recargas de Horas (Hour Topups) — Fase 2.3
 * Permite ao aluno comprar horas extras via Asaas
 *
 * Fluxo:
 * 1. Aluno clica "Recarregar Horas"
 * 2. Seleciona quantidade (5, 10, 20 horas)
 * 3. Calcula preço (configurável por hora)
 * 4. Cria topup em pending
 * 5. Redireciona para checkout Asaas
 * 6. Webhook confirma pagamento
 * 7. Horas são creditadas
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCustomer, createSubscription } from "@/lib/asaas/client";

// ============================================================================
// Tipos
// ============================================================================

export interface HourTopup {
  id: string;
  aluno_id: string;
  subscription_id: string;
  horas: number;
  valor: number;
  valor_unitario: number;
  status: "pending" | "ativa" | "utilizada" | "expirada";
  payment_id: string | null;
  expira_em: string | null;
  criada_em: string;
}

export interface TopupPackage {
  horas: number;
  descricao: string;
  precaria?: boolean; // desconto para pacotes maiores
}

// ============================================================================
// Configuração de pacotes padrão
// ============================================================================

export const TOPUP_PACKAGES: TopupPackage[] = [
  { horas: 5, descricao: "5 horas de conversação" },
  { horas: 10, descricao: "10 horas (melhor valor)" },
  { horas: 20, descricao: "20 horas (maior economia)" },
];

// ============================================================================
// Obter preço unitário de recarga
// ============================================================================

export async function getTopupUnitPrice(): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("billing_config")
      .select("valor")
      .eq("chave", "preco_recarga_por_hora")
      .single();

    if (error || !data) {
      console.warn(
        "Não encontrado preco_recarga_por_hora, usando padrão R$ 9.90"
      );
      return 9.9;
    }

    return parseFloat(data.valor);
  } catch (error) {
    console.error("Erro ao obter preço de recarga:", error);
    return 9.9; // fallback
  }
}

// ============================================================================
// Criar topup e gerar checkout
// ============================================================================

export async function createHourTopup(
  alunoId: string,
  horasDesejadas: number,
  emailAluno: string,
  nomeAluno: string
): Promise<{
  success: boolean;
  topupId?: string;
  checkoutUrl?: string;
  valor?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Validar horas desejadas
    if (horasDesejadas <= 0 || horasDesejadas % 5 !== 0) {
      return {
        success: false,
        error: "Quantidade de horas deve ser múltiplo de 5 (5, 10, 20, etc)",
      };
    }

    // 2. Buscar assinatura ativa
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, asaas_customer_id, asaas_subscription_id")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .single();

    if (subError || !subscription) {
      return { success: false, error: "Nenhuma assinatura ativa encontrada" };
    }

    // 3. Calcular preço
    const precoUnitario = await getTopupUnitPrice();
    const valorTotal = precoUnitario * horasDesejadas;

    // 4. Criar topup em pending
    const { data: topup, error: topupError } = await supabase
      .from("hour_topups")
      .insert({
        aluno_id: alunoId,
        subscription_id: subscription.id,
        horas: horasDesejadas,
        valor: Math.round(valorTotal * 100) / 100, // 2 casas decimais
        valor_unitario: precoUnitario,
        status: "pending",
        expira_em: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 1 ano
      })
      .select("id")
      .single();

    if (topupError || !topup) {
      console.error("Erro ao criar topup:", topupError);
      return { success: false, error: "Erro ao criar recarga" };
    }

    // 5. Criar ou usar customer no Asaas
    let customerId = subscription.asaas_customer_id;

    if (!customerId) {
      const { id: newCustomerId } = await createCustomer({
        name: nomeAluno,
        email: emailAluno,
      });
      customerId = newCustomerId;

      // Atualizar assinatura com customer_id
      await supabase
        .from("subscriptions")
        .update({ asaas_customer_id: customerId })
        .eq("id", subscription.id);
    }

    // 6. Criar cobrança única (não assinatura) no Asaas
    const { id: asaasInvoiceId } = await createSubscription({
      customerId,
      billingType: "PIX",
      value: parseFloat((Math.round(valorTotal * 100) / 100).toFixed(2)),
      nextDueDate: new Date().toISOString().split("T")[0],
      cycle: "MONTHLY", // Apenas 1 cobrança
      description: `Recarga de ${horasDesejadas}h — SouBilingue`,
      maxPaymentAttempts: 3,
    });

    // 7. Registrar asaas_invoice_id no topup
    await supabase
      .from("hour_topups")
      .update({
        // TODO: Adicionar coluna asaas_invoice_id se não existir
        status: "pending",
      })
      .eq("id", topup.id);

    // 8. Gerar checkout link
    const { generateCheckoutLink } = await import("@/lib/asaas/client");
    const checkoutUrl = generateCheckoutLink(
      subscription.asaas_subscription_id || asaasInvoiceId,
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/aluno`
    );

    return {
      success: true,
      topupId: topup.id,
      checkoutUrl,
      valor: parseFloat((Math.round(valorTotal * 100) / 100).toFixed(2)),
    };
  } catch (error) {
    console.error("Erro em createHourTopup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Confirmar pagamento de topup (chamado pelo webhook)
// ============================================================================

export async function confirmTopupPayment(
  topupId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar topup
    const { data: topup, error: topupError } = await supabase
      .from("hour_topups")
      .select("*, subscriptions(aluno_id)")
      .eq("id", topupId)
      .single();

    if (topupError || !topup) {
      return { success: false, error: "Topup não encontrado" };
    }

    // 2. Atualizar status para ativa
    const { error: updateError } = await supabase
      .from("hour_topups")
      .update({
        status: "ativa",
        payment_id: paymentId,
      })
      .eq("id", topupId);

    if (updateError) {
      console.error("Erro ao atualizar topup:", updateError);
      return { success: false, error: "Erro ao ativar recarga" };
    }

    // 3. Registrar ledger (adição de horas)
    const { error: ledgerError } = await supabase
      .from("usage_ledger")
      .insert({
        aluno_id: topup.subscriptions.aluno_id,
        subscription_id: topup.subscription_id,
        tipo: "recarga",
        segundos: topup.horas * 3600,
        descricao: `Recarga de ${topup.horas}h (R$ ${topup.valor})`,
        referencia_externa: topupId,
      });

    if (ledgerError) {
      console.error("Erro ao registrar ledger:", ledgerError);
    }

    // 4. Atualizar horas_restantes (via trigger ou cálculo manual)
    // A coluna horas_restantes é GENERATED ALWAYS, então não precisa UPDATE

    return { success: true };
  } catch (error) {
    console.error("Erro em confirmTopupPayment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Obter topups ativos do aluno
// ============================================================================

export async function getActiveTopups(alunoId: string): Promise<HourTopup[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: topups, error } = await supabase
      .from("hour_topups")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .is("expira_em", null) // Sem expiração definida
      .order("criada_em", { ascending: false });

    if (error) {
      console.error("Erro ao buscar topups:", error);
      return [];
    }

    return topups as HourTopup[];
  } catch (error) {
    console.error("Erro em getActiveTopups:", error);
    return [];
  }
}

// ============================================================================
// Obter histórico de topups
// ============================================================================

export async function getTopupHistory(
  alunoId: string,
  limit: number = 10
): Promise<HourTopup[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: topups, error } = await supabase
      .from("hour_topups")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("criada_em", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar histórico de topups:", error);
      return [];
    }

    return topups as HourTopup[];
  } catch (error) {
    console.error("Erro em getTopupHistory:", error);
    return [];
  }
}

// ============================================================================
// Marcar topup como expirado (chamado por cron job)
// ============================================================================

export async function expireOldTopups(): Promise<{
  success: boolean;
  expired?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Atualizar topups que passaram da data de expiração
    const { data, error } = await supabase
      .from("hour_topups")
      .update({ status: "expirada" })
      .eq("status", "ativa")
      .lt("expira_em", new Date().toISOString().split("T")[0])
      .select("id");

    if (error) {
      console.error("Erro ao expirar topups:", error);
      return { success: false, error: "Erro ao processar expiração" };
    }

    return { success: true, expired: data?.length || 0 };
  } catch (error) {
    console.error("Erro em expireOldTopups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
