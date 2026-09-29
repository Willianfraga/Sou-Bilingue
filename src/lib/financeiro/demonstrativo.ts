// Demonstrativo mensal (Fase C). Módulo puro, testado em
// test/financeiro.test.mjs. Entrada: dados brutos do banco
// (public.admin_financeiro_mensal) + fornecedores + câmbio atual.
//
// Regras para não misturar nem contar duas vezes:
//  * IA, por provedor: fatura CONFIRMADA lançada > valor fixo PREVISTO no
//    cadastro do fornecedor (estimado) > estimativa pelo CONSUMO (estimado).
//  * Fornecedor com valor fixo sem lançamento no mês entra como PREVISTO
//    (estimado), a partir do início da cobrança. Com lançamento, vale o lançamento.
//  * Taxa do gateway vem do Asaas (confirmada); pagamento sem o valor líquido
//    deixa a receita líquida PARCIAL.
//  * Dinheiro em centavos inteiros.

import { ehCategoriaIa } from "./categorias";

type J = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0) || 0;
const c = (reais: unknown) => Math.round(n(reais) * 100);

export type FornecedorResumo = {
  id: string;
  nome: string;
  categoria: string;
  moeda: string;
  valor_fixo_mensal: number | string | null;
  inicio_cobranca: string | null;
  criado_em: string;
  status: string;
  provedor_ia: string | null;
};

export type Previsto = { fornecedor: string; categoria: string; valorC: number };

export type LinhaMes = {
  mes: string;
  receitaBrutaC: number;
  receitaAssinaturasC: number;
  receitaHorasExtrasC: number;
  reembolsosC: number;
  taxasGatewayC: number;
  gatewayParcial: boolean;
  receitaLiquidaC: number;
  iaC: number | null;
  iaDetalhe: Array<{ provedor: string; fonte: "fatura" | "previsto" | "consumo"; valorC: number | null }>;
  iaOutrasFaturasC: number;
  fixosConfirmadosC: number;
  fixosEstimadosC: number;
  variaveisConfirmadosC: number;
  variaveisEstimadosC: number;
  impostosC: number;
  previstos: Previsto[];
  custoTotalC: number | null;
  resultadoC: number | null;
  margem: number | null;
  natureza: "confirmado" | "estimado" | "parcial" | "sem_dados";
  semCambio: boolean;
  realizadoPorCategoria: Record<string, number>;
  orcamento: Record<string, number>;
  pagantes: number;
  ativos: number;
  custoPorAtivoC: number | null;
  custoPorPaganteC: number | null;
};

const CATEGORIA_DO_PROVEDOR: Record<string, string> = { anthropic: "modelos_linguagem", elevenlabs: "sintese_voz" };

function paraReaisC(valor: number | string | null, moeda: string, taxaUsd: number | null): number | null {
  const centavos = c(valor);
  if (moeda === "BRL") return centavos;
  if (moeda === "USD" && taxaUsd) return Math.round(centavos * taxaUsd);
  return null; // EUR sem taxa, ou USD sem câmbio: não inventa
}

export function montarDemonstrativo(meses: unknown, fornecedores: FornecedorResumo[], taxaUsd: number | null): LinhaMes[] {
  const lista = Array.isArray(meses) ? (meses as J[]) : [];
  const porId = new Map(fornecedores.map((f) => [f.id, f]));

  return lista.map((m) => {
    const mes = String(m.mes).slice(0, 10);
    const lancamentos = (Array.isArray(m.lancamentos) ? m.lancamentos : []) as J[];
    const realizado: Record<string, number> = {};
    const somar = (cat: string, v: number) => (realizado[cat] = (realizado[cat] ?? 0) + v);
    let semCambio = false;

    // Previstos pelo cadastro (valor fixo, sem lançamento no mês).
    const comLancamento = new Set(lancamentos.map((l) => l.fornecedor_id).filter(Boolean) as string[]);
    const previstos: Previsto[] = [];
    const previstoIaPorProvedor = new Map<string, number>();
    for (const f of fornecedores) {
      if (f.status === "cancelado" || !n(f.valor_fixo_mensal) || comLancamento.has(f.id)) continue;
      const inicio = (f.inicio_cobranca ?? f.criado_em).slice(0, 7) + "-01";
      if (inicio > mes) continue;
      const valorC = paraReaisC(f.valor_fixo_mensal, f.moeda, taxaUsd);
      if (valorC === null) {
        semCambio = true;
        continue;
      }
      if (f.provedor_ia) previstoIaPorProvedor.set(f.provedor_ia, (previstoIaPorProvedor.get(f.provedor_ia) ?? 0) + valorC);
      else previstos.push({ fornecedor: f.nome, categoria: f.categoria, valorC });
    }

    // IA
    const faturaIaPorProvedor = new Map<string, number>();
    let iaOutrasFaturasC = 0;
    let fixosConfirmadosC = 0;
    let fixosEstimadosC = previstos.reduce((s, p) => s + p.valorC, 0);
    let variaveisConfirmadosC = 0;
    let variaveisEstimadosC = 0;
    let impostosC = 0;
    for (const p of previstos) somar(p.categoria, p.valorC);
    for (const l of lancamentos) {
      const valorC = c(l.valor_brl);
      const categoria = String(l.categoria);
      somar(categoria, valorC);
      if (ehCategoriaIa(categoria)) {
        const provedor = l.fornecedor_id ? porId.get(String(l.fornecedor_id))?.provedor_ia : null;
        if (provedor) faturaIaPorProvedor.set(provedor, (faturaIaPorProvedor.get(provedor) ?? 0) + valorC);
        else iaOutrasFaturasC += valorC;
        continue;
      }
      if (categoria === "impostos") impostosC += valorC;
      else if (l.tipo === "fixo") l.natureza === "confirmado" ? (fixosConfirmadosC += valorC) : (fixosEstimadosC += valorC);
      else l.natureza === "confirmado" ? (variaveisConfirmadosC += valorC) : (variaveisEstimadosC += valorC);
    }

    const consumo = (m.ia_estimado_usd ?? {}) as J;
    const provedores = new Set([...Object.keys(consumo), ...faturaIaPorProvedor.keys(), ...previstoIaPorProvedor.keys()]);
    const iaDetalhe: LinhaMes["iaDetalhe"] = [];
    let iaC: number | null = iaOutrasFaturasC;
    for (const p of provedores) {
      let valorC: number | null;
      let fonte: "fatura" | "previsto" | "consumo";
      if (faturaIaPorProvedor.has(p)) {
        valorC = faturaIaPorProvedor.get(p)!;
        fonte = "fatura";
      } else if (previstoIaPorProvedor.has(p)) {
        valorC = previstoIaPorProvedor.get(p)!;
        fonte = "previsto";
      } else {
        fonte = "consumo";
        valorC = taxaUsd ? Math.round(n(consumo[p]) * taxaUsd * 100) : null;
      }
      iaDetalhe.push({ provedor: p, fonte, valorC });
      if (valorC === null) {
        semCambio = true;
        iaC = null;
      } else if (iaC !== null) iaC += valorC;
      if (valorC !== null && fonte !== "fatura") somar(CATEGORIA_DO_PROVEDOR[p] ?? "modelos_linguagem", valorC);
    }

    const receitaAssinaturasC = c(m.receita_assinaturas);
    const receitaHorasExtrasC = c(m.receita_horas_extras);
    const receitaBrutaC = receitaAssinaturasC + receitaHorasExtrasC;
    const reembolsosC = c(m.reembolsos);
    const taxasGatewayC = c(m.taxas_gateway);
    const gatewayParcial = n(m.pagamentos_sem_liquido) > 0;
    const receitaLiquidaC = receitaBrutaC - reembolsosC - taxasGatewayC;

    const custoTotalC = iaC === null ? null : iaC + fixosConfirmadosC + fixosEstimadosC + variaveisConfirmadosC + variaveisEstimadosC + impostosC;
    const resultadoC = custoTotalC === null ? null : receitaLiquidaC - custoTotalC;
    const temEstimado = fixosEstimadosC > 0 || variaveisEstimadosC > 0 || iaDetalhe.some((d) => d.fonte !== "fatura" && (d.valorC ?? 0) > 0);
    const vazio = receitaBrutaC === 0 && reembolsosC === 0 && lancamentos.length === 0 && custoTotalC === 0;
    const natureza = vazio ? "sem_dados" : temEstimado ? "estimado" : gatewayParcial ? "parcial" : "confirmado";
    const pagantes = n(m.pagantes);
    const ativos = n(m.ativos);
    const orcamento: Record<string, number> = {};
    for (const [k, v] of Object.entries((m.orcamento ?? {}) as J)) orcamento[k] = c(v);
    if (custoTotalC !== null) realizado.total = custoTotalC;

    return {
      mes,
      receitaBrutaC,
      receitaAssinaturasC,
      receitaHorasExtrasC,
      reembolsosC,
      taxasGatewayC,
      gatewayParcial,
      receitaLiquidaC,
      iaC,
      iaDetalhe,
      iaOutrasFaturasC,
      fixosConfirmadosC,
      fixosEstimadosC,
      variaveisConfirmadosC,
      variaveisEstimadosC,
      impostosC,
      previstos,
      custoTotalC,
      resultadoC,
      margem: resultadoC === null || receitaLiquidaC <= 0 ? null : (resultadoC / receitaLiquidaC) * 100,
      natureza,
      semCambio,
      realizadoPorCategoria: realizado,
      orcamento,
      pagantes,
      ativos,
      custoPorAtivoC: custoTotalC === null || !ativos ? null : Math.round(custoTotalC / ativos),
      custoPorPaganteC: custoTotalC === null || !pagantes ? null : Math.round(custoTotalC / pagantes),
    };
  });
}

// Ponto de equilíbrio: quantos alunos pagantes cobrem os custos fixos, dada
// a margem de contribuição média por pagante do mês (estimativa).
export function pontoDeEquilibrio(l: LinhaMes): { pagantesNecessarios: number | null; contribuicaoC: number | null; fixosC: number; motivo?: string } {
  const fixosC = l.fixosConfirmadosC + l.fixosEstimadosC;
  if (!l.pagantes) return { pagantesNecessarios: null, contribuicaoC: null, fixosC, motivo: "Sem alunos pagantes no mês para medir a margem por aluno." };
  if (l.iaC === null) return { pagantesNecessarios: null, contribuicaoC: null, fixosC, motivo: "Câmbio indisponível para o custo de IA." };
  const variaveisC = l.iaC + l.variaveisConfirmadosC + l.variaveisEstimadosC + l.impostosC;
  const contribuicaoC = Math.round((l.receitaLiquidaC - variaveisC) / l.pagantes);
  if (contribuicaoC <= 0) return { pagantesNecessarios: null, contribuicaoC, fixosC, motivo: "A margem por aluno está zerada ou negativa: nenhum número de alunos cobre os custos fixos." };
  return { pagantesNecessarios: Math.ceil(fixosC / contribuicaoC), contribuicaoC, fixosC };
}

export type AlertaOrcamento = { categoria: string; nivel: "atencao" | "critico"; realizadoC: number; orcamentoC: number; percentual: number };

export function alertasDeOrcamento(l: LinhaMes): AlertaOrcamento[] {
  const alertas: AlertaOrcamento[] = [];
  for (const [categoria, orcamentoC] of Object.entries(l.orcamento)) {
    if (!orcamentoC) continue;
    const realizadoC = l.realizadoPorCategoria[categoria] ?? 0;
    const percentual = (realizadoC / orcamentoC) * 100;
    if (percentual >= 80) alertas.push({ categoria, nivel: percentual >= 100 ? "critico" : "atencao", realizadoC, orcamentoC, percentual });
  }
  return alertas.sort((a, b) => b.percentual - a.percentual);
}
