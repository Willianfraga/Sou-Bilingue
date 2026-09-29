// Indicadores da visão geral a partir das métricas do banco
// (public.admin_metricas). Módulo puro, testado em test/admin.test.mjs.
// Regras: dinheiro em centavos inteiros; custo de IA é ESTIMADO (preços da
// tabela precos_ia); receita é CONFIRMADA pelo webhook do Asaas; receita
// líquida é PARCIAL enquanto houver pagamento sem o valor líquido do Asaas.
// Nada é inventado: sem dado, o valor é null e a tela mostra "—".

import { variacao } from "./periodos";

type Json = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : 0) || 0;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});

export type Formato = "numero" | "reais" | "dolares" | "percentual" | "horas" | "minutos" | "ms";
export type Natureza = "confirmado" | "estimado" | "parcial" | "calculado";

export type Indicador = {
  id: string;
  rotulo: string;
  valor: number | null;
  anterior: number | null;
  variacao: number | null;
  formato: Formato;
  natureza: Natureza;
  ajuda: string;
  menorEhMelhor?: boolean;
};

export const centavos = (reais: number) => Math.round(reais * 100);
export const reaisDe = (c: number) => c / 100;
// Dólar (até 6 casas) → centavos de real com a taxa informada.
export const usdParaCentavos = (usd: number, taxa: number) => Math.round(usd * taxa * 100);

const div = (a: number, b: number) => (b ? a / b : null);

type Calculado = {
  usuarios: Json;
  aprendizagem: Json;
  ia: Json;
  financeiro: Json;
  receitaBrutaC: number;
  receitaLiquidaC: number;
  liquidaParcial: boolean;
  custoIaC: number | null;
  custoAulaUsd: number;
};

function calcular(m: unknown, taxa: number | null): Calculado {
  const r = obj(m);
  const usuarios = obj(r.usuarios);
  const aprendizagem = obj(r.aprendizagem);
  const ia = obj(r.ia);
  const financeiro = obj(r.financeiro);
  const receitaBrutaC = centavos(num(financeiro.receita_assinaturas)) + centavos(num(financeiro.receita_horas_extras));
  // Líquida: o que o Asaas informou + o bruto dos pagamentos sem essa
  // informação (horas extras ainda não trazem o líquido) → parcial.
  const semLiquidoC = centavos(num(financeiro.receita_assinaturas)) - centavos(num(financeiro.bruto_com_liquido));
  const receitaLiquidaC = centavos(num(financeiro.receita_liquida_informada)) + semLiquidoC + centavos(num(financeiro.receita_horas_extras));
  const liquidaParcial = num(financeiro.pagamentos_sem_liquido) > 0 || num(financeiro.horas_extras_vendidas) > 0;
  const custoUsd = num(ia.custo_usd);
  const custoAulaUsd = num(obj(obj(ia.por_origem).aula).custo_usd);
  return {
    usuarios,
    aprendizagem,
    ia,
    financeiro,
    receitaBrutaC,
    receitaLiquidaC,
    liquidaParcial,
    custoIaC: taxa ? usdParaCentavos(custoUsd, taxa) : null,
    custoAulaUsd,
  };
}

function ind(
  id: string,
  rotulo: string,
  atual: number | null,
  anterior: number | null,
  formato: Formato,
  natureza: Natureza,
  ajuda: string,
  menorEhMelhor = false,
): Indicador {
  return {
    id,
    rotulo,
    valor: atual,
    anterior,
    variacao: atual === null || anterior === null ? null : variacao(atual, anterior),
    formato,
    natureza,
    ajuda,
    menorEhMelhor,
  };
}

export type Secoes = { usuarios: Indicador[]; aprendizagem: Indicador[]; ia: Indicador[]; financeiro: Indicador[] };

export function montarIndicadores(atualBruto: unknown, anteriorBruto: unknown, taxa: number | null): Secoes {
  const a = calcular(atualBruto, taxa);
  const p = calcular(anteriorBruto, taxa);
  const u = (c: Calculado, k: string) => num(c.usuarios[k]);
  const ap = (c: Calculado, k: string) => num(c.aprendizagem[k]);
  const i = (c: Calculado, k: string) => num(c.ia[k]);
  const f = (c: Calculado, k: string) => num(c.financeiro[k]);
  const pct = (x: number | null) => (x === null ? null : x * 100);

  const ativacao = (c: Calculado) => pct(div(u(c, "novos_ativados"), u(c, "novos")));
  const conversao = (c: Calculado) => pct(div(u(c, "novos_pagantes"), u(c, "novos")));
  const cancelamento = (c: Calculado) => pct(div(u(c, "cancelamentos"), u(c, "pagantes") + u(c, "cancelamentos")));
  const mediaMin = (c: Calculado) => {
    const v = div(ap(c, "segundos"), u(c, "ativos_periodo"));
    return v === null ? null : v / 60;
  };
  const taxaErro = (c: Calculado) => pct(div(i(c, "chamadas_erro"), i(c, "chamadas")));
  const custoPor = (c: Calculado, base: number) => (c.custoIaC === null ? null : div(reaisDe(c.custoIaC), base));
  const resultadoC = (c: Calculado) => (c.custoIaC === null ? null : c.receitaLiquidaC - centavos(f(c, "reembolsado")) - c.custoIaC);
  const margem = (c: Calculado) => {
    const r = resultadoC(c);
    return r === null ? null : pct(div(r, c.receitaLiquidaC));
  };
  const ticket = (c: Calculado) => div(reaisDe(c.receitaBrutaC), f(c, "pagamentos_pagos") + f(c, "horas_extras_vendidas"));

  return {
    usuarios: [
      ind("total_alunos", "Total de alunos", u(a, "total_alunos"), null, "numero", "confirmado", "Contas de aluno cadastradas (com os filtros aplicados)."),
      ind("novos", "Novos cadastros", u(a, "novos"), u(p, "novos"), "numero", "confirmado", "Alunos cadastrados no período."),
      ind("ativos_periodo", "Alunos ativos no período", u(a, "ativos_periodo"), u(p, "ativos_periodo"), "numero", "confirmado", "Alunos com pelo menos uma sessão de aula ou mensagem no período."),
      ind("ativos_hoje", "Ativos hoje", u(a, "ativos_hoje"), null, "numero", "confirmado", "Alunos com atividade hoje (horário de Brasília)."),
      ind("ativos_7d", "Ativos em 7 dias", u(a, "ativos_7d"), null, "numero", "confirmado", "Alunos com atividade nos últimos 7 dias."),
      ind("ativos_30d", "Ativos em 30 dias", u(a, "ativos_30d"), null, "numero", "confirmado", "Alunos com atividade nos últimos 30 dias."),
      ind("pagantes", "Alunos pagantes", u(a, "pagantes"), null, "numero", "confirmado", "Assinatura ativa com acesso válido hoje."),
      ind("inativos", "Inativos há 30 dias", Math.max(0, u(a, "total_alunos") - u(a, "ativos_30d")), null, "numero", "calculado", "Alunos sem nenhuma atividade nos últimos 30 dias.", true),
      ind("ativacao", "Taxa de ativação", ativacao(a), ativacao(p), "percentual", "calculado", "Dos novos cadastros do período, quantos já fizeram pelo menos uma aula."),
      ind("conversao", "Conversão para pagante", conversao(a), conversao(p), "percentual", "calculado", "Dos novos cadastros do período, quantos já têm pagamento confirmado."),
      ind("cancelamentos", "Cancelamentos", u(a, "cancelamentos"), u(p, "cancelamentos"), "numero", "confirmado", "Renovações canceladas no período.", true),
      ind("taxa_cancelamento", "Taxa de cancelamento (aprox.)", cancelamento(a), cancelamento(p), "percentual", "calculado", "Cancelamentos ÷ (pagantes atuais + cancelamentos). Aproximação enquanto a base é pequena.", true),
    ],
    aprendizagem: [
      ind("sessoes", "Sessões de aula", ap(a, "sessoes"), ap(p, "sessoes"), "numero", "confirmado", "Sessões de aula iniciadas no período."),
      ind("horas_estudo", "Tempo total de estudo", ap(a, "segundos") / 3600, ap(p, "segundos") / 3600, "horas", "confirmado", "Soma do tempo das sessões de aula."),
      ind("media_por_aluno", "Tempo médio por aluno ativo", mediaMin(a), mediaMin(p), "minutos", "calculado", "Tempo total ÷ alunos ativos no período."),
      ind("certificados", "Certificados emitidos", ap(a, "certificados"), ap(p, "certificados"), "numero", "confirmado", "Certificados mensais emitidos no período (meta de todas as semanas cumprida)."),
    ],
    ia: [
      ind("conversas", "Conversas com tutores", i(a, "conversas"), i(p, "conversas"), "numero", "confirmado", "Conversas iniciadas no período (registradas desde 29/09/2026)."),
      ind("mensagens", "Mensagens", i(a, "mensagens_aluno") + i(a, "mensagens_tutor"), i(p, "mensagens_aluno") + i(p, "mensagens_tutor"), "numero", "confirmado", "Falas do aluno + respostas do tutor (desde 29/09/2026)."),
      ind("chamadas", "Chamadas de IA", i(a, "chamadas"), i(p, "chamadas"), "numero", "confirmado", "Chamadas aos provedores (texto, voz e transcrição), incluindo o assistente de vendas."),
      ind("taxa_erro", "Taxa de erro da IA", taxaErro(a), taxaErro(p), "percentual", "calculado", "Chamadas com falha ÷ total de chamadas (falhas registradas desde 29/09/2026).", true),
      ind("latencia", "Tempo médio de resposta", i(a, "latencia_media_ms") || null, i(p, "latencia_media_ms") || null, "ms", "confirmado", "Tempo médio de resposta do tutor (texto) nas chamadas com sucesso.", true),
      ind("tokens_entrada", "Tokens de entrada", i(a, "tokens_entrada"), i(p, "tokens_entrada"), "numero", "confirmado", "Tokens enviados ao modelo de linguagem (sem os de cache)."),
      ind("tokens_saida", "Tokens de saída", i(a, "tokens_saida"), i(p, "tokens_saida"), "numero", "confirmado", "Tokens gerados pelo modelo."),
      ind("tokens_cache", "Tokens em cache", i(a, "tokens_cache"), i(p, "tokens_cache"), "numero", "confirmado", "Tokens gravados ou lidos do cache de prompt (mais baratos)."),
      ind("custo_usd", "Custo de IA (US$)", i(a, "custo_usd"), i(p, "custo_usd"), "dolares", "estimado", "Estimativa com a tabela de preços do painel. O valor confirmado é a fatura do provedor.", true),
      ind("custo_brl", "Custo de IA (R$)", a.custoIaC === null ? null : reaisDe(a.custoIaC), p.custoIaC === null ? null : reaisDe(p.custoIaC), "reais", "estimado", "Custo em dólar × PTAX de venda do Banco Central.", true),
      ind("custo_por_conversa", "Custo médio por conversa", custoPor(a, i(a, "conversas")), custoPor(p, i(p, "conversas")), "reais", "estimado", "Custo de IA ÷ conversas do período.", true),
      ind("custo_por_ativo", "Custo de IA por aluno ativo", custoPor(a, u(a, "ativos_periodo")), custoPor(p, u(p, "ativos_periodo")), "reais", "estimado", "Custo de IA ÷ alunos ativos no período.", true),
      ind("custo_por_pagante", "Custo das aulas por pagante", a.custoIaC === null || !taxa ? null : div(usdParaCentavos(a.custoAulaUsd, taxa) / 100, u(a, "pagantes")), null, "reais", "estimado", "Custo de IA das aulas (sem o assistente de vendas) ÷ alunos pagantes.", true),
    ],
    financeiro: [
      ind("receita_bruta", "Receita bruta", reaisDe(a.receitaBrutaC), reaisDe(p.receitaBrutaC), "reais", "confirmado", "Mensalidades pagas (confirmadas pelo Asaas) + horas extras vendidas no período."),
      ind("receita_liquida", "Receita líquida", reaisDe(a.receitaLiquidaC), reaisDe(p.receitaLiquidaC), "reais", a.liquidaParcial ? "parcial" : "confirmado", "Depois da taxa do Asaas. Parcial quando algum pagamento ainda não tem o valor líquido informado."),
      ind("reembolsado", "Reembolsos", f(a, "reembolsado"), f(p, "reembolsado"), "reais", "confirmado", "Estornos confirmados pelo Asaas no período.", true),
      ind("mrr", "Receita recorrente mensal", f(a, "mrr"), null, "reais", "calculado", "Soma do preço cheio das assinaturas ativas sem cancelamento agendado."),
      ind("arr", "Receita recorrente anual", f(a, "mrr") * 12, null, "reais", "calculado", "Receita recorrente mensal × 12."),
      ind("ticket", "Ticket médio", ticket(a), ticket(p), "reais", "calculado", "Receita bruta ÷ número de pagamentos (mensalidades + horas extras)."),
      ind("assinaturas_novas", "Assinaturas novas", f(a, "assinaturas_novas"), f(p, "assinaturas_novas"), "numero", "confirmado", "Assinaturas com o 1º pagamento confirmado no período."),
      ind("custo_ia_brl", "Custo de IA", a.custoIaC === null ? null : reaisDe(a.custoIaC), p.custoIaC === null ? null : reaisDe(p.custoIaC), "reais", "estimado", "Mesmo custo da seção de IA, em reais.", true),
      ind("resultado", "Resultado estimado", resultadoC(a) === null ? null : reaisDe(resultadoC(a)!), resultadoC(p) === null ? null : reaisDe(resultadoC(p)!), "reais", "estimado", "Receita líquida − reembolsos − custo de IA. Ainda NÃO inclui custos fixos (servidor, banco, ferramentas): serão cadastrados na área Financeiro."),
      ind("margem", "Margem estimada", margem(a), margem(p), "percentual", "estimado", "Resultado estimado ÷ receita líquida."),
    ],
  };
}
