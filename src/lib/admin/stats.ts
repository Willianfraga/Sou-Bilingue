import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PlatformStats {
  total_alunos: number;
  alunos_ativos: number;
  total_horas_consumidas: number;
  total_receita: number;
  subscricoes_ativas: number;
  planos_mais_populares: Array<{ nome: string; quantidade: number }>;
}

export interface RelatorioFaturamento {
  periodo: string;
  receita_subscricoes: number;
  receita_topups: number;
  total_receita: number;
  numero_transacoes: number;
  ticket_medio: number;
}

export interface TopupsStats {
  total_vendas: number;
  total_horas_vendidas: number;
  total_receita: number;
  pacote_mais_popular: string;
  receita_por_pacote: Array<{
    pacote: string;
    horas: number;
    vendas: number;
    receita: number;
  }>;
}

/**
 * Obtém estatísticas gerais da plataforma
 */
export async function getPlatformStats(): Promise<PlatformStats | null> {
  const supabase = await createSupabaseServerClient();

  // Total de alunos
  const { count: totalAlunos } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Alunos ativos (com assinatura ativa)
  const { count: alunosAtivos } = await supabase
    .from("subscriptions")
    .select("aluno_id", { count: "exact", head: true })
    .eq("status", "ativa");

  // Total de horas consumidas
  const { data: horasConsumidas } = await supabase
    .from("usage_sessions")
    .select("segundos_utilizados")
    .eq("ativo", false);

  const totalSegundos = horasConsumidas?.reduce(
    (sum, s) => sum + (s.segundos_utilizados || 0),
    0
  ) || 0;
  const totalHoras = totalSegundos / 3600;

  // Total de receita (subscriptions + topups)
  const { data: pagamentos } = await supabase
    .from("payments")
    .select("valor");

  const totalReceita = pagamentos?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

  // Subscriptions ativas
  const { count: subsAtivas } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "ativa");

  // Planos mais populares
  const { data: planosPopulares } = await supabase
    .from("subscriptions")
    .select("plano:plano_id(nome)")
    .eq("status", "ativa");

  const planosMap: { [key: string]: number } = {};
  planosPopulares?.forEach((p: any) => {
    const planName = p.plano?.nome || "Desconhecido";
    planosMap[planName] = (planosMap[planName] || 0) + 1;
  });

  const planosOrdenados = Object.entries(planosMap)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  return {
    total_alunos: totalAlunos || 0,
    alunos_ativos: alunosAtivos || 0,
    total_horas_consumidas: Math.round(totalHoras * 100) / 100,
    total_receita: totalReceita,
    subscricoes_ativas: subsAtivas || 0,
    planos_mais_populares: planosOrdenados,
  };
}

/**
 * Obtém relatório de faturamento mensal
 */
export async function getRelatorioFaturamento(
  mes: string // formato: YYYY-MM
): Promise<RelatorioFaturamento | null> {
  const supabase = await createSupabaseServerClient();

  const inicio = new Date(`${mes}-01`);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);

  // Receita de subscriptions
  const { data: pagsSubs } = await supabase
    .from("payments")
    .select("valor")
    .eq("tipo", "subscription")
    .gte("data_criacao", inicio.toISOString())
    .lte("data_criacao", fim.toISOString());

  const receitaSubs = pagsSubs?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

  // Receita de topups
  const { data: pagsTopups } = await supabase
    .from("payments")
    .select("valor")
    .eq("tipo", "topup")
    .gte("data_criacao", inicio.toISOString())
    .lte("data_criacao", fim.toISOString());

  const receitaTopups = pagsTopups?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

  const totalReceita = receitaSubs + receitaTopups;
  const totalTransacoes = (pagsSubs?.length || 0) + (pagsTopups?.length || 0);
  const ticketMedio = totalTransacoes > 0 ? totalReceita / totalTransacoes : 0;

  return {
    periodo: mes,
    receita_subscricoes: receitaSubs,
    receita_topups: receitaTopups,
    total_receita: totalReceita,
    numero_transacoes: totalTransacoes,
    ticket_medio: Math.round(ticketMedio * 100) / 100,
  };
}

/**
 * Obtém estatísticas de topups
 */
export async function getTopupsStats(): Promise<TopupsStats | null> {
  const supabase = await createSupabaseServerClient();

  // Total de vendas
  const { count: totalVendas } = await supabase
    .from("hour_topups")
    .select("*", { count: "exact", head: true })
    .eq("pago", true);

  // Total de horas vendidas
  const { data: horas } = await supabase
    .from("hour_topups")
    .select("horas")
    .eq("pago", true);

  const totalHoras = horas?.reduce((sum, h) => sum + (h.horas || 0), 0) || 0;

  // Total de receita
  const { data: topups } = await supabase
    .from("hour_topups")
    .select("valor")
    .eq("pago", true);

  const totalReceita = topups?.reduce((sum, t) => sum + (t.valor || 0), 0) || 0;

  // Pacote mais popular
  const { data: topupsByPackage } = await supabase
    .from("hour_topups")
    .select("horas")
    .eq("pago", true);

  const packageCount: { [key: number]: number } = {};
  topupsByPackage?.forEach((t) => {
    const hours = t.horas || 0;
    packageCount[hours] = (packageCount[hours] || 0) + 1;
  });

  const pacoteMaisPop = Object.entries(packageCount)
    .map(([hours, count]) => ({ hours: parseInt(hours), count }))
    .sort((a, b) => b.count - a.count)[0];

  // Receita por pacote
  const { data: receitaPorPacote } = await supabase
    .from("hour_topups")
    .select("horas, valor")
    .eq("pago", true);

  const pacoteMap: { [key: number]: { vendas: number; receita: number } } = {};
  receitaPorPacote?.forEach((t) => {
    const horas = t.horas || 0;
    if (!pacoteMap[horas]) {
      pacoteMap[horas] = { vendas: 0, receita: 0 };
    }
    pacoteMap[horas].vendas += 1;
    pacoteMap[horas].receita += t.valor || 0;
  });

  const receitaPorPacoteFormatada = Object.entries(pacoteMap)
    .map(([horas, { vendas, receita }]) => ({
      pacote: `${horas}h`,
      horas: parseInt(horas),
      vendas,
      receita,
    }))
    .sort((a, b) => b.vendas - a.vendas);

  return {
    total_vendas: totalVendas || 0,
    total_horas_vendidas: totalHoras,
    total_receita: totalReceita,
    pacote_mais_popular: pacoteMaisPop ? `${pacoteMaisPop.hours}h` : "N/A",
    receita_por_pacote: receitaPorPacoteFormatada,
  };
}
