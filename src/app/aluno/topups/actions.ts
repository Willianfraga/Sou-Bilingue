"use server";

import { requireSessao } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createHourTopup,
  confirmTopupPayment,
  getActiveTopups,
  getTopupHistory,
  TOPUP_PACKAGES,
} from "@/lib/billing/topups";

/**
 * Obter pacotes disponíveis
 */
export async function getTopupPackagesAction() {
  return {
    success: true,
    packages: TOPUP_PACKAGES,
  };
}

/**
 * Iniciar recarga de horas
 * POST /api/topups/start
 */
export async function startTopupAction(horasDesejadas: number) {
  try {
    const sessao = await requireSessao();

    // Buscar dados do aluno
    const supabase = await createSupabaseServerClient();
    const { data: user } = await supabase.auth.admin.getUserById(
      sessao.userId
    );
    const userEmail = user?.user?.email;

    const { data: aluno } = await supabase
      .from("alunos")
      .select("*, profiles(nome)")
      .eq("id", sessao.userId)
      .single();

    if (!aluno || !userEmail) {
      return { success: false, error: "Aluno não encontrado" };
    }

    // Criar topup e gerar checkout
    const result = await createHourTopup(
      sessao.userId,
      horasDesejadas,
      userEmail,
      aluno.profiles?.nome || "Aluno"
    );

    return result;
  } catch (error) {
    console.error("Erro ao iniciar topup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao iniciar recarga",
    };
  }
}

/**
 * Confirmar pagamento de topup (chamado pelo webhook)
 */
export async function confirmTopupPaymentAction(
  topupId: string,
  paymentId: string
) {
  try {
    const result = await confirmTopupPayment(topupId, paymentId);
    return result;
  } catch (error) {
    console.error("Erro ao confirmar topup:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao confirmar pagamento",
    };
  }
}

/**
 * Obter topups ativos
 */
export async function getActiveTopupsAction() {
  try {
    const sessao = await requireSessao();

    const topups = await getActiveTopups(sessao.userId);

    return {
      success: true,
      topups,
    };
  } catch (error) {
    console.error("Erro ao obter topups ativos:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter topups",
    };
  }
}

/**
 * Obter histórico de topups
 */
export async function getTopupHistoryAction(limit: number = 10) {
  try {
    const sessao = await requireSessao();

    const topups = await getTopupHistory(sessao.userId, limit);

    return {
      success: true,
      topups,
    };
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter histórico",
    };
  }
}
