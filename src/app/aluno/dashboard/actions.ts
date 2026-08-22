"use server";

import { requireSessao } from "@/lib/auth/guards";
import {
  getConsumoMes,
  getHistoricoSessoes,
  getHistoricoTopups,
  getTendencias,
  getEstatisticasGerais,
} from "@/lib/billing/reports";

/**
 * Obter consumo do mês atual
 */
export async function getConsumoMesAction() {
  try {
    const sessao = await requireSessao();
    const consumo = await getConsumoMes(sessao.userId);

    return {
      success: true,
      consumo,
    };
  } catch (error) {
    console.error("Erro ao obter consumo:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter consumo",
    };
  }
}

/**
 * Obter histórico de sessões
 */
export async function getHistoricoSessoesAction(limit: number = 30) {
  try {
    const sessao = await requireSessao();
    const sessoes = await getHistoricoSessoes(sessao.userId, limit);

    return {
      success: true,
      sessoes,
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

/**
 * Obter histórico de topups
 */
export async function getHistoricoTopupsAction(limit: number = 10) {
  try {
    const sessao = await requireSessao();
    const topups = await getHistoricoTopups(sessao.userId, limit);

    return {
      success: true,
      topups,
    };
  } catch (error) {
    console.error("Erro ao obter topups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao obter topups",
    };
  }
}

/**
 * Obter tendências (últimos 7 dias)
 */
export async function getTendenciasAction() {
  try {
    const sessao = await requireSessao();
    const tendencias = await getTendencias(sessao.userId);

    return {
      success: true,
      tendencias,
    };
  } catch (error) {
    console.error("Erro ao obter tendências:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter tendências",
    };
  }
}

/**
 * Obter estatísticas gerais
 */
export async function getEstatisticasGeraisAction() {
  try {
    const sessao = await requireSessao();
    const stats = await getEstatisticasGerais(sessao.userId);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter estatísticas",
    };
  }
}

/**
 * Obter todos os dados para o dashboard
 */
export async function getDashboardCompletAction() {
  try {
    const sessao = await requireSessao();

    const [consumo, sessoes, topups, tendencias, stats] = await Promise.all([
      getConsumoMes(sessao.userId),
      getHistoricoSessoes(sessao.userId, 10),
      getHistoricoTopups(sessao.userId, 5),
      getTendencias(sessao.userId),
      getEstatisticasGerais(sessao.userId),
    ]);

    return {
      success: true,
      data: {
        consumo,
        sessoes,
        topups,
        tendencias,
        stats,
      },
    };
  } catch (error) {
    console.error("Erro ao obter dashboard completo:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao carregar dashboard",
    };
  }
}
