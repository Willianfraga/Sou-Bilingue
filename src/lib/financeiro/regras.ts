// Validação e conversão de valores do financeiro (Fase C). Módulo puro,
// testado em test/financeiro.test.mjs. Dinheiro em centavos inteiros e taxa
// de câmbio em micro-unidades (BigInt): nada de ponto flutuante nos cálculos.

import { IDS_CATEGORIA, categoriaPorId, ehCategoriaIa } from "./categorias";

export const MOEDAS = ["BRL", "USD", "EUR"] as const;
export type Moeda = (typeof MOEDAS)[number];

const limpar = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, max) : "");

// "1.234,56" ou "1234.56" → 123456 centavos. null se inválido ou ambíguo
// (ex.: "1,234" — no Brasil a vírgula é decimal; não adivinha).
export function paraCentavos(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
  let t = limpar(v, 30).replace(/\s|R\$|US\$|€/g, "");
  if (!t) return null;
  if (t.includes(",")) {
    // vírgula decimal (até 2 casas); pontos só como milhar em grupos de 3
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(t)) return null;
    t = t.replace(/\./g, "").replace(",", ".");
  }
  const m = t.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
}

// Taxa "5,2204" → 5220400n (micro). null se inválida ou ≤ 0.
export function taxaParaMicro(v: unknown): bigint | null {
  const t = limpar(String(v ?? ""), 20).replace(",", ".");
  const m = t.match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!m) return null;
  const micro = BigInt(m[1]) * BigInt(1_000_000) + BigInt((m[2] ?? "").padEnd(6, "0") || "0");
  return micro > BigInt(0) ? micro : null;
}

// centavos na moeda original × taxa → centavos de real (arredonda meio para cima).
export function converterCentavos(centavosOriginais: number, taxaMicro: bigint): number {
  const produto = BigInt(centavosOriginais) * taxaMicro;
  const um = BigInt(1_000_000);
  return Number((produto + um / BigInt(2)) / um);
}

// "2026-09" → "2026-09-01"
export function competenciaDoMes(v: unknown): string | null {
  const t = limpar(v, 10);
  const m = t.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || Number(m[1]) < 2020 || Number(m[1]) > 2100) return null;
  return `${m[1]}-${m[2]}-01`;
}

export type EntradaLancamento = {
  fornecedorId?: unknown;
  categoria: unknown;
  tipo?: unknown;
  descricao: unknown;
  competencia: unknown;
  valor: unknown;
  moeda: unknown;
  taxa?: unknown; // opcional; sem ela, USD usa a PTAX
  natureza: unknown;
  comprovante?: unknown;
};

export type LancamentoValido = {
  fornecedorId: string | null;
  categoria: string;
  tipo: "fixo" | "variavel";
  descricao: string;
  competencia: string;
  centavosOriginais: number;
  moeda: Moeda;
  taxaInformada: bigint | null;
  natureza: "estimado" | "confirmado";
  comprovante: string | null;
};

export function validarLancamento(e: EntradaLancamento): { ok: true; dados: LancamentoValido } | { ok: false; erro: string } {
  const categoria = limpar(e.categoria, 40);
  if (!IDS_CATEGORIA.includes(categoria)) return { ok: false, erro: "Escolha uma categoria." };
  const descricao = limpar(e.descricao, 200);
  if (descricao.length < 2) return { ok: false, erro: "Descreva o lançamento." };
  const competencia = competenciaDoMes(e.competencia);
  if (!competencia) return { ok: false, erro: "Mês de referência inválido." };
  const centavos = paraCentavos(e.valor);
  if (centavos === null) return { ok: false, erro: "Valor inválido." };
  const moeda = limpar(e.moeda, 3) as Moeda;
  if (!(MOEDAS as readonly string[]).includes(moeda)) return { ok: false, erro: "Moeda inválida." };
  const natureza = e.natureza === "confirmado" ? "confirmado" : e.natureza === "estimado" ? "estimado" : null;
  if (!natureza) return { ok: false, erro: "Diga se o valor é estimado ou confirmado." };
  // Consumo de IA já é estimado automaticamente: aqui só entra a fatura.
  if (ehCategoriaIa(categoria) && natureza !== "confirmado") {
    return { ok: false, erro: "Em categorias de IA, lance só a fatura (confirmado). A estimativa vem do consumo registrado automaticamente." };
  }
  const taxaTexto = limpar(e.taxa, 20);
  const taxaInformada = taxaTexto ? taxaParaMicro(taxaTexto) : null;
  if (taxaTexto && !taxaInformada) return { ok: false, erro: "Taxa de câmbio inválida." };
  if (moeda === "EUR" && !taxaInformada) return { ok: false, erro: "Para euro, informe a taxa de câmbio usada." };
  const tipo = e.tipo === "fixo" || e.tipo === "variavel" ? e.tipo : categoriaPorId(categoria)!.tipoPadrao;
  const fornecedorId = typeof e.fornecedorId === "string" && /^[0-9a-f-]{36}$/i.test(e.fornecedorId) ? e.fornecedorId : null;
  const comprovante = limpar(e.comprovante, 300);
  if (comprovante && !/^https:\/\//.test(comprovante)) return { ok: false, erro: "O link do comprovante precisa começar com https://" };
  return {
    ok: true,
    dados: { fornecedorId, categoria, tipo, descricao, competencia, centavosOriginais: centavos, moeda, taxaInformada, natureza, comprovante: comprovante || null },
  };
}

export type EntradaFornecedor = Record<string, unknown>;
export type FornecedorValido = {
  nome: string;
  categoria: string;
  empresa: string | null;
  plano_contratado: string | null;
  tipo_cobranca: string;
  moeda: Moeda;
  valor_fixo_mensal: number | null; // reais (numeric(12,2))
  custo_variavel: string | null;
  franquia: string | null;
  unidade_consumo: string | null;
  dia_vencimento: number | null;
  inicio_cobranca: string | null;
  centro_custo: string | null;
  responsavel: string | null;
  status: string;
  link_painel: string | null;
  provedor_ia: string | null;
  observacoes: string | null;
};

export function validarFornecedor(e: EntradaFornecedor): { ok: true; dados: FornecedorValido } | { ok: false; erro: string } {
  const opcional = (v: unknown, max: number) => limpar(v, max) || null;
  const nome = limpar(e.nome, 80);
  if (nome.length < 2) return { ok: false, erro: "Informe o nome da ferramenta." };
  const categoria = limpar(e.categoria, 40);
  if (!IDS_CATEGORIA.includes(categoria)) return { ok: false, erro: "Escolha uma categoria." };
  const tipo = limpar(e.tipo_cobranca, 10);
  if (!["fixo", "variavel", "misto", "anual", "avulso"].includes(tipo)) return { ok: false, erro: "Tipo de cobrança inválido." };
  const moeda = limpar(e.moeda, 3) as Moeda;
  if (!(MOEDAS as readonly string[]).includes(moeda)) return { ok: false, erro: "Moeda inválida." };
  const valorTexto = limpar(e.valor_fixo_mensal, 30);
  const centavos = valorTexto ? paraCentavos(valorTexto) : null;
  if (valorTexto && centavos === null) return { ok: false, erro: "Valor fixo inválido." };
  const dia = limpar(e.dia_vencimento, 2);
  const diaN = dia ? Number(dia) : null;
  if (diaN !== null && (!Number.isInteger(diaN) || diaN < 1 || diaN > 31)) return { ok: false, erro: "Dia de vencimento entre 1 e 31." };
  const inicio = limpar(e.inicio_cobranca, 10);
  if (inicio && !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return { ok: false, erro: "Data de início inválida." };
  const link = limpar(e.link_painel, 300);
  if (link && !/^https:\/\//.test(link)) return { ok: false, erro: "O link do painel precisa começar com https://" };
  const status = limpar(e.status, 10) || "ativo";
  if (!["ativo", "teste", "cancelado"].includes(status)) return { ok: false, erro: "Status inválido." };
  const provedor = limpar(e.provedor_ia, 20);
  if (provedor && !["anthropic", "elevenlabs"].includes(provedor)) return { ok: false, erro: "Provedor de IA inválido." };
  return {
    ok: true,
    dados: {
      nome,
      categoria,
      empresa: opcional(e.empresa, 80),
      plano_contratado: opcional(e.plano_contratado, 80),
      tipo_cobranca: tipo,
      moeda,
      valor_fixo_mensal: centavos === null ? null : centavos / 100,
      custo_variavel: opcional(e.custo_variavel, 200),
      franquia: opcional(e.franquia, 200),
      unidade_consumo: opcional(e.unidade_consumo, 40),
      dia_vencimento: diaN,
      inicio_cobranca: inicio || null,
      centro_custo: opcional(e.centro_custo, 60),
      responsavel: opcional(e.responsavel, 80),
      status,
      link_painel: link || null,
      provedor_ia: provedor || null,
      observacoes: opcional(e.observacoes, 1000),
    },
  };
}

// Cancelamento mensal aproximado (últimos 90 dias) e valor do cliente ao
// longo do tempo (LTV = receita mensal média por pagante ÷ cancelamento
// mensal). Estimativas: com base pequena, null em vez de número inventado.
export function churnMensal(cancelamentos90d: number, pagantes: number): number | null {
  const base = pagantes + cancelamentos90d;
  if (!base || cancelamentos90d <= 0) return null;
  return cancelamentos90d / 3 / base;
}

export function ltvEstimadoC(receitaMensalPorPaganteC: number | null, churn: number | null): number | null {
  if (receitaMensalPorPaganteC === null || !churn || churn <= 0) return null;
  return Math.round(receitaMensalPorPaganteC / churn);
}
