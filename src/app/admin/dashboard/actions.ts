"use server";

import { requireSessao } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPlatformStats,
  getRelatorioFaturamento,
  getTopupsStats,
  type PlatformStats,
  type RelatorioFaturamento,
  type TopupsStats,
} from "@/lib/admin/stats";
import { getAIUsageDashboard, type AIUsageDashboard } from "@/lib/ai/usage";

interface ActionState<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Verifica se é admin da plataforma
 */
async function requireAdmin() {
  const sessao = await requireSessao();
  const user = sessao as any;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    throw new Error("Acesso negado: não é administrador");
  }

  return { user, profile };
}

export async function getPlatformStatsAction(): Promise<ActionState<PlatformStats>> {
  try {
    await requireAdmin();
    const stats = await getPlatformStats();

    if (!stats) {
      return {
        success: false,
        error: "Erro ao buscar estatísticas",
      };
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas da plataforma:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar estatísticas",
    };
  }
}

export async function getRelatorioFaturamentoAction(
  mes: string
): Promise<ActionState<RelatorioFaturamento>> {
  try {
    await requireAdmin();
    const relatorio = await getRelatorioFaturamento(mes);

    if (!relatorio) {
      return {
        success: false,
        error: "Erro ao buscar relatório de faturamento",
      };
    }

    return {
      success: true,
      data: relatorio,
    };
  } catch (error) {
    console.error("Erro ao buscar relatório de faturamento:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar relatório",
    };
  }
}

export async function getTopupsStatsAction(): Promise<ActionState<TopupsStats>> {
  try {
    await requireAdmin();
    const stats = await getTopupsStats();

    if (!stats) {
      return {
        success: false,
        error: "Erro ao buscar estatísticas de topups",
      };
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas de topups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar estatísticas",
    };
  }
}

export async function getAIUsageDashboardAction(
  periodDays: number = 30,
): Promise<ActionState<AIUsageDashboard>> {
  try {
    await requireAdmin();
    return { success: true, data: await getAIUsageDashboard(periodDays) };
  } catch (error) {
    console.error("Erro ao buscar consumo de IA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar consumo de IA",
    };
  }
}

export async function getPlanosPrecosAction(): Promise<
  ActionState<Array<{ id: string; nome: string; preco: number; horas: number }>>
> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const { data: planos } = await supabase
      .from("planos")
      .select("id, nome, preco, horas")
      .order("preco", { ascending: true });

    return {
      success: true,
      data: planos || [],
    };
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    return {
      success: false,
      error: "Erro ao buscar planos",
    };
  }
}

export async function atualizarPlanosPrecoAction(
  planoId: string,
  novoPreco: number
): Promise<ActionState<null>> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("planos")
      .update({ preco: novoPreco })
      .eq("id", planoId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Erro ao atualizar preço do plano:", error);
    return {
      success: false,
      error: "Erro ao atualizar preço",
    };
  }
}

export async function listAlunos(
  limit: number = 50,
  offset: number = 0
): Promise<
  ActionState<
    Array<{
      id: string;
      email: string;
      nome: string;
      plano_ativo: string | null;
      horas_restantes: number;
      data_criacao: string;
    }>
  >
> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const { data: alunos } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        subscriptions(plano:plano_id(nome)),
        created_at
      `
      )
      .order("created_at", { ascending: false }) as any;

    const formatted = (alunos as any[])?.map((a: any) => ({
      id: a.id,
      email: a.email,
      nome: a.full_name || "Sem nome",
      plano_ativo: a.subscriptions?.[0]?.plano?.[0]?.nome || null,
      horas_restantes: 0, // TODO: calcular
      data_criacao: a.created_at,
    })) || [];

    return {
      success: true,
      data: formatted,
    };
  } catch (error) {
    console.error("Erro ao listar alunos:", error);
    return {
      success: false,
      error: "Erro ao listar alunos",
    };
  }
}

export async function obterDetalhesAlunoAction(alunoId: string): Promise<
  ActionState<{
    id: string;
    email: string;
    nome: string;
    plano_ativo: string | null;
    horas_totais: number;
    horas_usadas: number;
    sessoes_total: number;
    total_gasto: number;
    data_criacao: string;
  }>
> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServerClient();

    const { data: aluno } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", alunoId)
      .single();

    if (!aluno) {
      return {
        success: false,
        error: "Aluno não encontrado",
      };
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plano:plano_id(nome), horas_total")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .single() as any;

    const { data: sessions } = await supabase
      .from("usage_sessions")
      .select("segundos_utilizados")
      .eq("aluno_id", alunoId)
      .eq("ativo", false);

    const { data: topups } = await supabase
      .from("hour_topups")
      .select("valor")
      .eq("aluno_id", alunoId)
      .eq("pago", true);

    const horasUsadas =
      ((sessions as any)?.reduce((sum: number, s: any) => sum + (s.segundos_utilizados || 0), 0) || 0) / 3600 || 0;
    const totalGasto = (topups as any)?.reduce((sum: number, t: any) => sum + (t.valor || 0), 0) || 0;

    return {
      success: true,
      data: {
        id: aluno.id,
        email: aluno.email,
        nome: aluno.full_name || "Sem nome",
        plano_ativo: (sub?.plano as any)?.[0]?.nome || null,
        horas_totais: (sub?.horas_total as any) || 0,
        horas_usadas: Math.round(horasUsadas * 100) / 100,
        sessoes_total: (sessions as any)?.length || 0,
        total_gasto: totalGasto,
        data_criacao: aluno.created_at,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar detalhes do aluno:", error);
    return {
      success: false,
      error: "Erro ao buscar detalhes",
    };
  }
}
