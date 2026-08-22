import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Periodicidade = "semana" | "mes" | "trimestre" | "ano";

interface ConsumoComPeriodo {
  periodo: Periodicidade;
  horas_total: number;
  horas_utilizadas: number;
  horas_restantes: number;
  percentual_usado: number;
  sessoes_total: number;
  duracao_media_minutos: number;
}

interface ComparativoMeses {
  mes: string;
  horas_usadas: number;
  sessoes: number;
}

/**
 * Calcula o intervalo de datas baseado na periodicidade
 */
function getDateRange(
  periodo: Periodicidade
): { inicio: Date; fim: Date; diasAnteriores: Date } {
  const agora = new Date();
  let inicio: Date;
  let diasAnteriores: Date;

  switch (periodo) {
    case "semana":
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 7);
      diasAnteriores = new Date(inicio);
      diasAnteriores.setDate(diasAnteriores.getDate() - 7);
      break;
    case "mes":
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 30);
      diasAnteriores = new Date(inicio);
      diasAnteriores.setDate(diasAnteriores.getDate() - 30);
      break;
    case "trimestre":
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 90);
      diasAnteriores = new Date(inicio);
      diasAnteriores.setDate(diasAnteriores.getDate() - 90);
      break;
    case "ano":
      inicio = new Date(agora);
      inicio.setFullYear(agora.getFullYear() - 1);
      diasAnteriores = new Date(inicio);
      diasAnteriores.setFullYear(diasAnteriores.getFullYear() - 1);
      break;
  }

  return { inicio, fim: agora, diasAnteriores };
}

/**
 * Obtém consumo filtrado por período
 */
export async function getConsumoComPeriodo(
  alunoId: string,
  periodo: Periodicidade
): Promise<ConsumoComPeriodo | null> {
  const supabase = await createSupabaseServerClient();
  const { inicio, fim } = getDateRange(periodo);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("horas_total")
    .eq("aluno_id", alunoId)
    .eq("status", "ativa")
    .single();

  const { data: sessions } = await supabase
    .from("usage_sessions")
    .select("segundos_utilizados")
    .eq("aluno_id", alunoId)
    .eq("ativo", false)
    .gte("encerrada_em", inicio.toISOString())
    .lte("encerrada_em", fim.toISOString());

  if (!subscription) {
    return null;
  }

  const totalSeconds = sessions?.reduce(
    (sum, s) => sum + (s.segundos_utilizados || 0),
    0
  ) || 0;
  const horasUtilizadas = totalSeconds / 3600;
  const horasRestantes = Math.max(
    (subscription.horas_total || 0) - horasUtilizadas,
    0
  );
  const percentualUsado =
    subscription.horas_total > 0
      ? Math.round((horasUtilizadas / (subscription.horas_total || 1)) * 100)
      : 0;

  const duracaoTotal = sessions?.reduce((sum, s) => sum + (s.segundos_utilizados || 0), 0) || 0;
  const duracao_media_minutos =
    (sessions?.length || 0) > 0 ? Math.round(duracaoTotal / (sessions?.length || 1) / 60) : 0;

  return {
    periodo,
    horas_total: subscription.horas_total || 0,
    horas_utilizadas: Math.round(horasUtilizadas * 100) / 100,
    horas_restantes: Math.round(horasRestantes * 100) / 100,
    percentual_usado: percentualUsado,
    sessoes_total: sessions?.length || 0,
    duracao_media_minutos,
  };
}

/**
 * Obtém comparativo entre períodos (últimos 12 meses)
 */
export async function getComparativoMeses(
  alunoId: string
): Promise<ComparativoMeses[]> {
  const supabase = await createSupabaseServerClient();
  const comparativo: ComparativoMeses[] = [];

  // Últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const dataAtual = new Date();
    dataAtual.setMonth(dataAtual.getMonth() - i);

    const anoMes = dataAtual
      .toISOString()
      .substring(0, 7);

    const inicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const fim = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);

    const { data: sessions } = await supabase
      .from("usage_sessions")
      .select("segundos_utilizados")
      .eq("aluno_id", alunoId)
      .eq("ativo", false)
      .gte("encerrada_em", inicio.toISOString())
      .lte("encerrada_em", fim.toISOString());

    const totalSeconds = sessions?.reduce(
      (sum, s) => sum + (s.segundos_utilizados || 0),
      0
    ) || 0;
    const horas = Math.round((totalSeconds / 3600) * 100) / 100;

    comparativo.push({
      mes: dataAtual.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
      horas_usadas: horas,
      sessoes: sessions?.length || 0,
    });
  }

  return comparativo;
}

/**
 * Obtém tendências com período customizável
 */
export async function getTendenciasComPeriodo(
  alunoId: string,
  periodo: Periodicidade
): Promise<Array<{ data: string; horas_usadas: number; sessoes: number }>> {
  const supabase = await createSupabaseServerClient();
  const { inicio, fim } = getDateRange(periodo);

  const { data: sessions } = await supabase
    .from("usage_sessions")
    .select("encerrada_em, segundos_utilizados")
    .eq("aluno_id", alunoId)
    .eq("ativo", false)
    .gte("encerrada_em", inicio.toISOString())
    .lte("encerrada_em", fim.toISOString())
    .order("encerrada_em", { ascending: true });

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const grouped: {
    [key: string]: { horas: number; sessoes: number };
  } = {};

  sessions.forEach((s) => {
    const dataStr = s.encerrada_em.split("T")[0];
    if (!grouped[dataStr]) {
      grouped[dataStr] = { horas: 0, sessoes: 0 };
    }
    grouped[dataStr].horas +=
      (s.segundos_utilizados || 0) / 3600;
    grouped[dataStr].sessoes += 1;
  });

  return Object.entries(grouped).map(([data, { horas, sessoes }]) => ({
    data,
    horas_usadas: Math.round(horas * 100) / 100,
    sessoes,
  }));
}

/**
 * Calcula taxa de crescimento entre períodos
 */
export async function getTaxaCrescimento(
  alunoId: string,
  periodo: Periodicidade
): Promise<{ percentual: number; tendencia: "crescimento" | "declinio" | "estavel" }> {
  const supabase = await createSupabaseServerClient();
  const { inicio, fim, diasAnteriores } = getDateRange(periodo);

  // Período atual
  const { data: sessoesAtual } = await supabase
    .from("usage_sessions")
    .select("segundos_utilizados")
    .eq("aluno_id", alunoId)
    .eq("ativo", false)
    .gte("encerrada_em", inicio.toISOString())
    .lte("encerrada_em", fim.toISOString());

  // Período anterior
  const { data: sessoesAnterior } = await supabase
    .from("usage_sessions")
    .select("segundos_utilizados")
    .eq("aluno_id", alunoId)
    .eq("ativo", false)
    .gte("encerrada_em", diasAnteriores.toISOString())
    .lt("encerrada_em", inicio.toISOString());

  const horasAtual =
    sessoesAtual?.reduce((sum, s) => sum + (s.segundos_utilizados || 0), 0) || 0 / 3600;
  const horasAnterior =
    sessoesAnterior?.reduce((sum, s) => sum + (s.segundos_utilizados || 0), 0) || 0 / 3600;

  const percentual =
    horasAnterior > 0
      ? Math.round(((horasAtual - horasAnterior) / horasAnterior) * 100)
      : 0;

  return {
    percentual: Math.abs(percentual),
    tendencia:
      percentual > 5 ? "crescimento" : percentual < -5 ? "declinio" : "estavel",
  };
}
