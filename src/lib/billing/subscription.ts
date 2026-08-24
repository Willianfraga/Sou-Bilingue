/**
 * Gerenciamento de assinaturas e planos
 * Integração entre Supabase e Asaas
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCustomer, createSubscription } from "@/lib/asaas/client";

// ============================================================================
// Tipos
// ============================================================================

export interface PlanDetails {
  id: string;
  nome: string;
  preco: number;
  horas_mensais: number;
  descricao: string;
}

export interface SubscriptionDetails {
  id: string;
  aluno_id: string;
  plano_id: string;
  status: string;
  ciclo_inicio: string;
  ciclo_fim: string;
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  asaas_subscription_id: string | null;
}

// ============================================================================
// Buscar planos disponíveis
// ============================================================================

export async function getPlanos(): Promise<PlanDetails[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .eq("ativo", true)
    .order("ordem");

  if (error) {
    console.error("Erro ao buscar planos:", error);
    return [];
  }

  return data;
}

export async function getPlano(planoId: string): Promise<PlanDetails | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .eq("id", planoId)
    .single();

  if (error) {
    console.error("Erro ao buscar plano:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Buscar assinatura ativa
// ============================================================================

export async function getActiveSubscription(
  alunoId: string
): Promise<SubscriptionDetails | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("status", "ativa")
    .order("criada_em", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Sem resultados
      return null;
    }
    console.error("Erro ao buscar assinatura:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Criar nova assinatura
// ============================================================================

export async function createNewSubscription(
  alunoId: string,
  planoId: string,
  nomeAluno: string,
  emailAluno: string,
  cpf?: string
): Promise<{ success: boolean; subscription?: SubscriptionDetails; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar plano
    const plano = await getPlano(planoId);
    if (!plano) {
      return { success: false, error: "Plano não encontrado" };
    }

    // 2. Criar customer no Asaas
    const customer = await createCustomer({
      name: nomeAluno,
      email: emailAluno,
      cpfCnpj: cpf,
      externalReference: `soubilingue:aluno:${alunoId}`,
    });

    // 3. Datas do ciclo
    const hoje = new Date();
    const inicioMes = new Date(hoje);
    const proximoMes = new Date(hoje);
    proximoMes.setMonth(proximoMes.getMonth() + 1);

    // 4. Criar assinatura no Asaas
    const asaasSubscription = await createSubscription({
      customerId: customer.id,
      billingType: "UNDEFINED",
      value: plano.preco,
      nextDueDate: hoje.toISOString().split("T")[0],
      cycle: "MONTHLY",
      description: `Sou Bilíngue - Plano ${plano.nome}`,
      maxPaymentAttempts: 3,
      externalReference: `soubilingue:aluno:${alunoId}:plano:${planoId}`,
      callback: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.soubilingue.com.br"}/aluno?pagamento=sucesso`,
        autoRedirect: true,
      },
    });

    // 5. Criar assinatura no Supabase
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        aluno_id: alunoId,
        plano_id: planoId,
        status: "pendente",
        ciclo_inicio: inicioMes.toISOString().split("T")[0],
        ciclo_fim: proximoMes.toISOString().split("T")[0],
        horas_total: plano.horas_mensais,
        horas_utilizadas: 0,
        asaas_subscription_id: asaasSubscription.id,
        asaas_customer_id: customer.id,
      })
      .select()
      .single();

    if (subError) {
      throw new Error(`Erro ao criar assinatura: ${subError.message}`);
    }

    return { success: true, subscription };
  } catch (error) {
    console.error("Erro ao criar nova assinatura:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Renovar assinatura (mensal)
// ============================================================================

export async function renewSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Buscar assinatura
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*, planos(*)")
      .eq("id", subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return { success: false, error: "Assinatura não encontrada" };
    }

    // Calcular novo ciclo
    const ultimoCicloFim = new Date(subscription.ciclo_fim);
    const proximoInicio = ultimoCicloFim;
    const proximoFim = new Date(proximoInicio);
    proximoFim.setMonth(proximoFim.getMonth() + 1);

    // Atualizar assinatura
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        ciclo_inicio: proximoInicio.toISOString().split("T")[0],
        ciclo_fim: proximoFim.toISOString().split("T")[0],
        horas_total: subscription.planos.horas_mensais,
        horas_utilizadas: 0,
        renovada_em: new Date().toISOString(),
        atualizada_em: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (updateError) {
      throw new Error(`Erro ao renovar: ${updateError.message}`);
    }

    // Registrar no ledger
    await supabase.from("usage_ledger").insert({
      aluno_id: subscription.aluno_id,
      subscription_id: subscriptionId,
      tipo: "renovacao",
      segundos: subscription.planos.horas_mensais * 3600,
      descricao: `Renovação automática - ${subscription.planos.nome}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao renovar assinatura:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Cancelar assinatura
// ============================================================================

export async function cancelSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Buscar
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("asaas_subscription_id")
      .eq("id", subscriptionId)
      .single();

    if (fetchError) {
      return { success: false, error: "Assinatura não encontrada" };
    }

    // Cancelar no Asaas
    if (subscription.asaas_subscription_id) {
      const { cancelSubscription: asaasCancelSub } = await import(
        "@/lib/asaas/client"
      );
      await asaasCancelSub(subscription.asaas_subscription_id);
    }

    // Cancelar no Supabase
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelada",
        cancelada_em: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (updateError) {
      throw new Error(`Erro ao cancelar: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Verificar se aluno pode usar IA (tem horas)
// ============================================================================

export async function canUseAI(
  alunoId: string
): Promise<{ can: boolean; horasRestantes?: number; error?: string }> {
  try {
    const subscription = await getActiveSubscription(alunoId);

    if (!subscription) {
      return { can: false, error: "Sem assinatura ativa" };
    }

    if (subscription.horas_restantes <= 0) {
      return { can: false, error: "Sem horas disponíveis" };
    }

    return { can: true, horasRestantes: subscription.horas_restantes };
  } catch (error) {
    return {
      can: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
