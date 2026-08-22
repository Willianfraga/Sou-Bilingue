"use server";

import { redirect } from "next/navigation";
import { requireSessao } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createNewSubscription, getPlano, getPlanos } from "@/lib/billing/subscription";
import { generateCheckoutLink } from "@/lib/asaas/client";

/**
 * Buscar lista de planos disponíveis
 */
export async function getPlanosList() {
  try {
    return await getPlanos();
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    throw new Error("Erro ao carregar planos");
  }
}

/**
 * Processar checkout e criar assinatura
 */
export async function processCheckout(
  planId: string
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  try {
    // 1. Validar usuário
    const sessao = await requireSessao();

    // 2. Validar plano
    const plano = await getPlano(planId);
    if (!plano) {
      return { success: false, error: "Plano inválido" };
    }

    // 3. Buscar dados do aluno
    const supabase = await createSupabaseServerClient();
    const { data: aluno, error: alunoError } = await supabase
      .from("alunos")
      .select("*, profiles(nome)")
      .eq("id", sessao.userId)
      .single();

    if (alunoError || !aluno) {
      return { success: false, error: "Aluno não encontrado" };
    }

    // 4. Verificar se já tem assinatura ativa
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("aluno_id", sessao.userId)
      .eq("status", "ativa")
      .single();

    if (existingSubscription) {
      return { success: false, error: "Você já possui uma assinatura ativa" };
    }

    // 5. Buscar email do usuário
    const { data: userData } = await supabase.auth.admin.getUserById(
      sessao.userId
    );
    const emailAluno = userData?.user?.email;

    if (!emailAluno) {
      return { success: false, error: "Email do aluno não encontrado" };
    }

    // 6. Criar assinatura
    const result = await createNewSubscription(
      sessao.userId,
      planId,
      aluno.profiles?.nome || "Aluno",
      emailAluno,
      aluno.cpf_cnpj
    );

    if (!result.success || !result.subscription) {
      return { success: false, error: result.error || "Erro ao criar assinatura" };
    }

    // 7. Gerar link de checkout do Asaas
    const checkoutUrl = generateCheckoutLink(
      result.subscription.asaas_subscription_id || "",
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/aluno`
    );

    return { success: true, checkoutUrl };
  } catch (error) {
    console.error("Erro ao processar checkout:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
