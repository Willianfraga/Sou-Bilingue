/**
 * Gerenciamento de sessões de uso (Fase 2)
 * Rastreamento de horas de conversação em tempo real
 *
 * Fluxo:
 * 1. POST /api/sessions/start → cria usage_sessions
 * 2. Estudante conversa (contador rodando)
 * 3. POST /api/sessions/end → encerra e debita horas
 * 4. Timeout automático (1h inativo) → encerra sozinho
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "./subscription";

// ============================================================================
// Tipos
// ============================================================================

export interface UsageSession {
  id: string;
  aluno_id: string;
  subscription_id: string;
  iniciada_em: string;
  encerrada_em: string | null;
  segundos_utilizados: number;
  ativo: boolean;
  tipo: "conversa" | "teste_gratuito" | "teste_pago";
}

// ============================================================================
// Criar sessão de uso
// ============================================================================

export async function createUsageSession(
  alunoId: string,
  tipo: "conversa" | "teste_gratuito" | "teste_pago" = "conversa"
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar assinatura ativa
    const subscription = await getActiveSubscription(alunoId);
    if (!subscription) {
      return {
        success: false,
        error: "Nenhuma assinatura ativa encontrada",
      };
    }

    // 2. Verificar se há horas disponíveis
    if (subscription.horas_restantes <= 0) {
      return {
        success: false,
        error: "Você não possui horas disponíveis. Recarregue seu plano.",
      };
    }

    // 3. Verificar se já existe sessão ativa
    const { data: existingSession } = await supabase
      .from("usage_sessions")
      .select("id")
      .eq("aluno_id", alunoId)
      .eq("ativo", true)
      .single();

    if (existingSession) {
      return {
        success: false,
        error: "Você já possui uma sessão ativa",
      };
    }

    // 4. Criar nova sessão
    const { data: session, error: createError } = await supabase
      .from("usage_sessions")
      .insert({
        aluno_id: alunoId,
        subscription_id: subscription.id,
        tipo,
        ativo: true,
        segundos_utilizados: 0,
      })
      .select("id")
      .single();

    if (createError || !session) {
      console.error("Erro ao criar sessão:", createError);
      return { success: false, error: "Erro ao iniciar sessão" };
    }

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("Erro em createUsageSession:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Encerrar sessão e registrar consumo
// ============================================================================

export async function endUsageSession(
  sessionId: string,
  alunoId: string
): Promise<{ success: boolean; horasConsumidas?: number; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar sessão
    const { data: session, error: fetchError } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("aluno_id", alunoId)
      .eq("ativo", true)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Sessão não encontrada" };
    }

    // 2. Calcular duração
    const iniciada = new Date(session.iniciada_em).getTime();
    const agora = new Date().getTime();
    const segundosDecorridos = Math.floor((agora - iniciada) / 1000);

    // 3. Encerrar sessão
    const { error: updateError } = await supabase
      .from("usage_sessions")
      .update({
        ativo: false,
        encerrada_em: new Date().toISOString(),
        segundos_utilizados: segundosDecorridos,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Erro ao encerrar sessão:", updateError);
      return { success: false, error: "Erro ao encerrar sessão" };
    }

    // 4. Registrar no ledger
    const { error: ledgerError } = await supabase
      .from("usage_ledger")
      .insert({
        aluno_id: alunoId,
        subscription_id: session.subscription_id,
        tipo: "uso",
        segundos: -segundosDecorridos, // Negativo = consumo
        descricao: `Sessão de conversação (${Math.floor(segundosDecorridos / 60)} min)`,
        referencia_externa: sessionId,
      });

    if (ledgerError) {
      console.error("Erro ao registrar ledger:", ledgerError);
    }

    // 5. Atualizar horas_utilizadas na subscription
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        horas_utilizadas:
          session.subscription.horas_utilizadas +
          Math.ceil(segundosDecorridos / 3600),
      })
      .eq("id", session.subscription_id);

    if (subError) {
      console.error("Erro ao atualizar subscription:", subError);
    }

    const horasConsumidas = Math.ceil(segundosDecorridos / 3600);

    return {
      success: true,
      horasConsumidas,
    };
  } catch (error) {
    console.error("Erro em endUsageSession:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Obter sessão ativa atual
// ============================================================================

export async function getActiveSession(
  alunoId: string
): Promise<UsageSession | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: session, error } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", true)
      .single();

    if (error || !session) {
      return null;
    }

    return session as UsageSession;
  } catch (error) {
    console.error("Erro em getActiveSession:", error);
    return null;
  }
}

// ============================================================================
// Obter tempo decorrido da sessão atual
// ============================================================================

export async function getSessionElapsedTime(
  sessionId: string,
  alunoId: string
): Promise<{ success: boolean; segundos?: number; minutos?: number; horas?: number; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: session, error } = await supabase
      .from("usage_sessions")
      .select("iniciada_em, ativo")
      .eq("id", sessionId)
      .eq("aluno_id", alunoId)
      .single();

    if (error || !session) {
      return { success: false, error: "Sessão não encontrada" };
    }

    if (!session.ativo) {
      return { success: false, error: "Sessão já foi encerrada" };
    }

    const iniciada = new Date(session.iniciada_em).getTime();
    const agora = new Date().getTime();
    const segundos = Math.floor((agora - iniciada) / 1000);

    return {
      success: true,
      segundos,
      minutos: Math.floor(segundos / 60),
      horas: Math.floor(segundos / 3600),
    };
  } catch (error) {
    console.error("Erro em getSessionElapsedTime:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function heartbeatUsageSession(sessionId: string, alunoId: string) {
  const supabase = await createSupabaseServerClient();
  const agora = new Date().toISOString();
  const { error } = await supabase.from("usage_sessions")
    .update({ last_activity_at: agora, atualizada_em: agora })
    .eq("id", sessionId).eq("aluno_id", alunoId).eq("ativo", true);
  return error ? { success: false, error: "Não foi possível manter a sessão ativa" } : { success: true };
}

// ============================================================================
// Forçar encerramento por timeout
// ============================================================================

export async function forceEndSessionByTimeout(
  sessionId: string,
  alunoId: string,
  maxIdleSeconds: number = 3600 // 1 hora padrão
): Promise<{ success: boolean; timedOut?: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Buscar sessão
    const { data: session, error: fetchError } = await supabase
      .from("usage_sessions")
      .select("iniciada_em, atualizada_em, ativo")
      .eq("id", sessionId)
      .eq("aluno_id", alunoId)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "Sessão não encontrada" };
    }

    if (!session.ativo) {
      return { success: true, timedOut: false }; // Já encerrada
    }

    // Calcular tempo de inatividade (baseado em atualizada_em)
    const lastUpdate = new Date(session.atualizada_em).getTime();
    const agora = new Date().getTime();
    const segundosInativo = Math.floor((agora - lastUpdate) / 1000);

    if (segundosInativo > maxIdleSeconds) {
      // Timeout acionado — encerrar sessão
      return await endUsageSession(sessionId, alunoId);
    }

    return { success: true, timedOut: false };
  } catch (error) {
    console.error("Erro em forceEndSessionByTimeout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ============================================================================
// Obter histórico de sessões
// ============================================================================

export async function getSessionHistory(
  alunoId: string,
  limit: number = 10
): Promise<UsageSession[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: sessions, error } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", false) // Apenas encerradas
      .order("encerrada_em", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      return [];
    }

    return sessions as UsageSession[];
  } catch (error) {
    console.error("Erro em getSessionHistory:", error);
    return [];
  }
}
