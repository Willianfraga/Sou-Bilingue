"use server";

import { requireSessao } from "@/lib/auth/guards";
import {
  createUsageSession,
  endUsageSession,
  getActiveSession,
  getSessionElapsedTime,
  getSessionHistory,
} from "@/lib/billing/sessions";

/**
 * Iniciar sessão de uso
 * POST /api/sessions/start
 */
export async function startSessionAction() {
  try {
    const sessao = await requireSessao();

    const result = await createUsageSession(sessao.userId, "conversa");

    return result;
  } catch (error) {
    console.error("Erro ao iniciar sessão:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao iniciar sessão",
    };
  }
}

/**
 * Encerrar sessão de uso
 * POST /api/sessions/end
 */
export async function endSessionAction(sessionId: string) {
  try {
    const sessao = await requireSessao();

    const result = await endUsageSession(sessionId, sessao.userId);

    return result;
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao encerrar sessão",
    };
  }
}

/**
 * Obter sessão ativa
 */
export async function getActiveSessionAction() {
  try {
    const sessao = await requireSessao();

    const session = await getActiveSession(sessao.userId);

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error("Erro ao obter sessão ativa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao obter sessão",
    };
  }
}

/**
 * Obter tempo decorrido da sessão atual
 */
export async function getElapsedTimeAction(sessionId: string) {
  try {
    const sessao = await requireSessao();

    const result = await getSessionElapsedTime(sessionId, sessao.userId);

    return result;
  } catch (error) {
    console.error("Erro ao obter tempo decorrido:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao obter tempo decorrido",
    };
  }
}

/**
 * Obter histórico de sessões
 */
export async function getHistoryAction(limit: number = 10) {
  try {
    const sessao = await requireSessao();

    const sessions = await getSessionHistory(sessao.userId, limit);

    return {
      success: true,
      sessions,
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
