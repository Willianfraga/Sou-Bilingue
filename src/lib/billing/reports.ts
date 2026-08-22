/**
 * Relatórios e Dashboard — Fase 2.4
 * Dados consolidados de consumo, histórico e gráficos
 *
 * Endpoints:
 * - GET /api/reports/consumo-mes (consumo mensal)
 * - GET /api/reports/historico-sessoes (últimas 30 sessões)
 * - GET /api/reports/topups-gastos (histórico de recargas)
 * - GET /api/reports/tendencias (últimos 7 dias)
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

// ============================================================================
// Tipos
// ============================================================================

export interface ConsumoMes {
  mes: string; // "2026-08"
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
  primeira_sessao: string | null;
  ultima_sessao: string | null;
}

export interface SessaoHistorico {
  id: string;
  iniciada_em: string;
  encerrada_em: string | null;
  duracao_minutos: number;
  segundos_utilizados: number;
  tipo: string;
}

export interface TopupHistorico {
  id: string;
  horas: number;
  valor: number;
  status: string;
  criada_em: string;
  expira_em: string | null;
}

export interface Tendencia {
  data: string; // "2026-08-22"
  horas_usadas: number;
  sessoes: number;
}

// ============================================================================
// Consumo do mês atual
// ============================================================================

export async function getConsumoMes(alunoId: string): Promise<ConsumoMes | null> {
  try {
    const supabase = await createSupabaseServerClient();

    // Buscar subscription ativa
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .single();

    if (subError || !subscription) {
      return null;
    }

    // Buscar sessões do mês atual
    const { data: sessoes, error: sessError } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", false)
      .gte("encerrada_em", subscription.ciclo_inicio)
      .lte("encerrada_em", subscription.ciclo_fim);

    if (sessError) {
      console.error("Erro ao buscar sessões:", sessError);
      return null;
    }

    // Calcular métricas
    const totalSessoes = sessoes?.length || 0;
    const segundosTotais = sessoes?.reduce((acc, s) => acc + (s.segundos_utilizados || 0), 0) || 0;
    const minutosTotais = Math.floor(segundosTotais / 60);
    const duracaoMedia = totalSessoes > 0 ? minutosTotais / totalSessoes : 0;

    const percentualUsado = subscription.horas_total > 0
      ? Math.round((subscription.horas_utilizadas / subscription.horas_total) * 100)
      : 0;

    const primeiraData = sessoes?.[sessoes.length - 1]?.iniciada_em || null;
    const ultimaData = sessoes?.[0]?.encerrada_em || null;

    return {
      mes: new Date(subscription.ciclo_inicio).toISOString().substring(0, 7),
      horas_total: subscription.horas_total,
      horas_utilizadas: subscription.horas_utilizadas,
      horas_restantes: subscription.horas_restantes,
      percentual_usado: percentualUsado,
      sessoes_total: totalSessoes,
      duracao_media_minutos: Math.round(duracaoMedia),
      primeira_sessao: primeiraData,
      ultima_sessao: ultimaData,
    };
  } catch (error) {
    console.error("Erro em getConsumoMes:", error);
    return null;
  }
}

// ============================================================================
// Histórico de sessões
// ============================================================================

export async function getHistoricoSessoes(
  alunoId: string,
  limit: number = 30
): Promise<SessaoHistorico[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: sessoes, error } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", false)
      .order("encerrada_em", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      return [];
    }

    return (
      sessoes?.map((s) => ({
        id: s.id,
        iniciada_em: s.iniciada_em,
        encerrada_em: s.encerrada_em,
        duracao_minutos: Math.ceil(s.segundos_utilizados / 60),
        segundos_utilizados: s.segundos_utilizados,
        tipo: s.tipo,
      })) || []
    );
  } catch (error) {
    console.error("Erro em getHistoricoSessoes:", error);
    return [];
  }
}

// ============================================================================
// Histórico de topups (recargas)
// ============================================================================

export async function getHistoricoTopups(
  alunoId: string,
  limit: number = 10
): Promise<TopupHistorico[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: topups, error } = await supabase
      .from("hour_topups")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("criada_em", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar topups:", error);
      return [];
    }

    return (
      topups?.map((t) => ({
        id: t.id,
        horas: t.horas,
        valor: t.valor,
        status: t.status,
        criada_em: t.criada_em,
        expira_em: t.expira_em,
      })) || []
    );
  } catch (error) {
    console.error("Erro em getHistoricoTopups:", error);
    return [];
  }
}

// ============================================================================
// Tendências (últimos 7 dias)
// ============================================================================

export async function getTendencias(alunoId: string): Promise<Tendencia[]> {
  try {
    const supabase = await createSupabaseServerClient();

    // Últimos 7 dias
    const hoje = new Date();
    const seteDisasAtras = new Date(hoje);
    seteDisasAtras.setDate(seteDisasAtras.getDate() - 7);

    const { data: sessoes, error } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", false)
      .gte("encerrada_em", seteDisasAtras.toISOString())
      .lte("encerrada_em", hoje.toISOString());

    if (error) {
      console.error("Erro ao buscar tendências:", error);
      return [];
    }

    // Agrupar por data
    const porData: Record<string, { horas: number; sessoes: number }> = {};

    sessoes?.forEach((s) => {
      const data = s.encerrada_em?.substring(0, 10) || "";
      if (!porData[data]) {
        porData[data] = { horas: 0, sessoes: 0 };
      }
      porData[data].horas += Math.ceil(s.segundos_utilizados / 3600);
      porData[data].sessoes += 1;
    });

    // Converter para array ordenado
    return Object.entries(porData)
      .map(([data, stats]) => ({
        data,
        horas_usadas: stats.horas,
        sessoes: stats.sessoes,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  } catch (error) {
    console.error("Erro em getTendencias:", error);
    return [];
  }
}

// ============================================================================
// Estatísticas gerais
// ============================================================================

export async function getEstatisticasGerais(alunoId: string): Promise<{
  assinatura_ativa: boolean;
  total_horas_compradas: number;
  total_horas_usadas: number;
  total_gasto: number;
  sessoes_lifetime: number;
  dias_como_membro: number;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .single();

    // Todas as sessões
    const { data: sessoes } = await supabase
      .from("usage_sessions")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("ativo", false);

    // Topups
    const { data: topups } = await supabase
      .from("hour_topups")
      .select("*")
      .eq("aluno_id", alunoId);

    // Ledger
    const { data: ledger } = await supabase
      .from("usage_ledger")
      .select("*")
      .eq("aluno_id", alunoId);

    const totalHorasCompradas =
      (subscription?.horas_total || 0) +
      (topups?.reduce((acc, t) => acc + t.horas, 0) || 0);

    const totalHorasUsadas =
      sessoes?.reduce((acc, s) => acc + Math.ceil(s.segundos_utilizados / 3600), 0) || 0;

    const totalGasto = topups?.reduce((acc, t) => acc + t.valor, 0) || 0;

    const diasMembro = subscription?.criada_em
      ? Math.floor(
          (new Date().getTime() - new Date(subscription.criada_em).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    return {
      assinatura_ativa: !!subscription,
      total_horas_compradas: totalHorasCompradas,
      total_horas_usadas: totalHorasUsadas,
      total_gasto: Math.round(totalGasto * 100) / 100,
      sessoes_lifetime: sessoes?.length || 0,
      dias_como_membro: diasMembro,
    };
  } catch (error) {
    console.error("Erro em getEstatisticasGerais:", error);
    return {
      assinatura_ativa: false,
      total_horas_compradas: 0,
      total_horas_usadas: 0,
      total_gasto: 0,
      sessoes_lifetime: 0,
      dias_como_membro: 0,
    };
  }
}
