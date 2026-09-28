/**
 * Gerenciamento de assinaturas e planos
 * Integração entre Supabase e Asaas
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createCustomer,
  createPayment,
  createSubscription,
  getSubscriptionInvoiceUrl,
} from "@/lib/asaas/client";
import {
  DESCONTO_PRIMEIRA_MENSALIDADE,
  nomeDeExibicao,
  valorPrimeiraMensalidade,
} from "@/lib/billing/planos";

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

const URL_APOS_PAGAMENTO = () =>
  `${process.env.NEXT_PUBLIC_APP_URL || "https://app.soubilingue.com.br"}/aluno?pagamento=sucesso`;

const dataISO = (d: Date) => d.toISOString().split("T")[0];

function daquiAUmMes(base = new Date()) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// Assinatura recorrente no Asaas, preço cheio. Chamada no checkout (plano sem
// desconto) ou pelo webhook, quando a 1ª mensalidade com desconto é paga.
export async function criarAssinaturaRecorrente(params: {
  alunoId: string;
  planoId: string;
  nomePlano: string;
  preco: number;
  customerId: string;
  primeiroVencimento: Date;
}) {
  return createSubscription({
    customerId: params.customerId,
    billingType: "UNDEFINED",
    value: params.preco,
    nextDueDate: dataISO(params.primeiroVencimento),
    cycle: "MONTHLY",
    description: `Sou Bilíngue - Plano ${nomeDeExibicao(params.nomePlano)}`,
    maxPaymentAttempts: 3,
    externalReference: `soubilingue:aluno:${params.alunoId}:plano:${params.planoId}`,
    callback: { successUrl: URL_APOS_PAGAMENTO(), autoRedirect: true },
  });
}

// alunoId sempre vem da sessão (processCheckout). A escrita usa service role
// porque subscriptions só tem policy de SELECT para o aluno.
export async function createNewSubscription(
  alunoId: string,
  planoId: string,
  nomeAluno: string,
  emailAluno: string,
  cpf?: string
): Promise<{ success: boolean; subscription?: SubscriptionDetails; checkoutUrl?: string; error?: string }> {
  try {
    const supabase = createSupabaseAdminClient();

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
    const valorPrimeira = valorPrimeiraMensalidade(plano.preco, plano.nome);
    const comDesconto = valorPrimeira < plano.preco;

    // 4. Assinatura no Supabase (pendente até o pagamento)
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        aluno_id: alunoId,
        plano_id: planoId,
        status: "pendente",
        ciclo_inicio: dataISO(hoje),
        ciclo_fim: dataISO(daquiAUmMes(hoje)),
        horas_total: plano.horas_mensais,
        horas_utilizadas: 0,
        asaas_customer_id: customer.id,
        valor_primeira_mensalidade: valorPrimeira,
      })
      .select()
      .single();

    if (subError || !subscription) {
      throw new Error(`Erro ao criar assinatura: ${subError?.message}`);
    }

    // 5a. Com desconto: só a cobrança avulsa da 1ª mensalidade agora. A
    // recorrente nasce no webhook quando ela for paga — quem desiste antes
    // de pagar nunca recebe cobrança do mês seguinte.
    if (comDesconto) {
      const cobranca = await createPayment({
        customerId: customer.id,
        billingType: "UNDEFINED",
        value: valorPrimeira,
        dueDate: dataISO(hoje),
        description: `Sou Bilíngue - Plano ${nomeDeExibicao(plano.nome)} - 1ª mensalidade com ${DESCONTO_PRIMEIRA_MENSALIDADE}% de desconto`,
        externalReference: `soubilingue:primeira:${subscription.id}`,
        callback: { successUrl: URL_APOS_PAGAMENTO(), autoRedirect: true },
      });
      const { error } = await supabase
        .from("subscriptions")
        .update({ asaas_primeira_cobranca_id: cobranca.id })
        .eq("id", subscription.id);
      if (error) throw new Error(`Erro ao registrar cobrança: ${error.message}`);
      if (!cobranca.invoiceUrl) throw new Error("O Asaas não retornou a fatura da 1ª mensalidade");
      return { success: true, subscription, checkoutUrl: cobranca.invoiceUrl };
    }

    // 5b. Sem desconto (plano de teste): assinatura recorrente já agora.
    const asaasSubscription = await criarAssinaturaRecorrente({
      alunoId,
      planoId,
      nomePlano: plano.nome,
      preco: plano.preco,
      customerId: customer.id,
      primeiroVencimento: hoje,
    });
    const { error } = await supabase
      .from("subscriptions")
      .update({ asaas_subscription_id: asaasSubscription.id })
      .eq("id", subscription.id);
    if (error) throw new Error(`Erro ao registrar assinatura: ${error.message}`);

    return {
      success: true,
      subscription: { ...subscription, asaas_subscription_id: asaasSubscription.id },
      checkoutUrl: await getSubscriptionInvoiceUrl(asaasSubscription.id),
    };
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
