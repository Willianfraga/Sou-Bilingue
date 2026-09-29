// Painel — Fase C: custos, ferramentas, orçamento e financeiro. Conversão de
// moeda exata, estimado × confirmado sem contagem dupla, ponto de equilíbrio,
// alertas de orçamento, cancelamento e LTV.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  churnMensal,
  competenciaDoMes,
  converterCentavos,
  ltvEstimadoC,
  paraCentavos,
  taxaParaMicro,
  validarFornecedor,
  validarLancamento,
} from "../src/lib/financeiro/regras.ts";
import { alertasDeOrcamento, montarDemonstrativo, pontoDeEquilibrio } from "../src/lib/financeiro/demonstrativo.ts";
import { CATEGORIAS, ehCategoriaIa } from "../src/lib/financeiro/categorias.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("valores e câmbio", () => {
  test("valor em reais nos dois formatos", () => {
    assert.equal(paraCentavos("1.234,56"), 123456);
    assert.equal(paraCentavos("1234.56"), 123456);
    assert.equal(paraCentavos("R$ 59,8"), 5980);
    assert.equal(paraCentavos("10"), 1000);
    assert.equal(paraCentavos("-5"), null);
    assert.equal(paraCentavos("abc"), null);
    assert.equal(paraCentavos("1,234"), null);
  });

  test("taxa e conversão exatas (sem ponto flutuante)", () => {
    assert.equal(taxaParaMicro("5,2204"), 5_220_400n);
    assert.equal(taxaParaMicro("0"), null);
    // US$ 22,00 × 5,2204 = R$ 114,8488 → R$ 114,85
    assert.equal(converterCentavos(2200, 5_220_400n), 11485);
    // R$ 0,10 + R$ 0,20 como centavos: nada de 0,30000000000000004
    assert.equal(converterCentavos(10, 1_000_000n) + converterCentavos(20, 1_000_000n), 30);
  });

  test("mês de referência", () => {
    assert.equal(competenciaDoMes("2026-09"), "2026-09-01");
    assert.equal(competenciaDoMes("2026-13"), null);
    assert.equal(competenciaDoMes("setembro"), null);
  });
});

describe("lançamentos e fornecedores", () => {
  const base = { categoria: "hospedagem", descricao: "Servidor", competencia: "2026-09", valor: "80,00", moeda: "BRL", natureza: "confirmado" };

  test("lançamento válido com tipo padrão da categoria", () => {
    const r = validarLancamento(base);
    assert.equal(r.ok, true);
    assert.equal(r.dados.tipo, "fixo");
    assert.equal(r.dados.centavosOriginais, 8000);
  });

  test("IA: só fatura confirmada (a estimativa já vem do consumo)", () => {
    assert.equal(validarLancamento({ ...base, categoria: "modelos_linguagem", natureza: "estimado" }).ok, false);
    assert.equal(validarLancamento({ ...base, categoria: "modelos_linguagem", natureza: "confirmado" }).ok, true);
  });

  test("euro exige taxa; link precisa ser https", () => {
    assert.equal(validarLancamento({ ...base, moeda: "EUR" }).ok, false);
    assert.equal(validarLancamento({ ...base, moeda: "EUR", taxa: "6,1" }).ok, true);
    assert.equal(validarLancamento({ ...base, comprovante: "http://x" }).ok, false);
  });

  test("fornecedor: valida categoria, valor, dia e link", () => {
    const ok = validarFornecedor({ nome: "Supabase", categoria: "banco_dados", tipo_cobranca: "fixo", moeda: "USD", valor_fixo_mensal: "25,00", dia_vencimento: "5", link_painel: "https://supabase.com" });
    assert.equal(ok.ok, true);
    assert.equal(ok.dados.valor_fixo_mensal, 25);
    assert.equal(validarFornecedor({ nome: "X", categoria: "banco_dados", tipo_cobranca: "fixo", moeda: "BRL" }).ok, false, "nome curto");
    assert.equal(validarFornecedor({ nome: "Xis", categoria: "nada", tipo_cobranca: "fixo", moeda: "BRL" }).ok, false);
    assert.equal(validarFornecedor({ nome: "Xis", categoria: "outros", tipo_cobranca: "fixo", moeda: "BRL", dia_vencimento: "40" }).ok, false);
    assert.equal(validarFornecedor({ nome: "Xis", categoria: "outros", tipo_cobranca: "fixo", moeda: "BRL", link_painel: "javascript:alert(1)" }).ok, false);
  });

  test("categorias de IA marcadas", () => {
    assert.ok(ehCategoriaIa("modelos_linguagem"));
    assert.ok(!ehCategoriaIa("hospedagem"));
    assert.ok(CATEGORIAS.length >= 25);
  });
});

describe("demonstrativo (estimado × confirmado, sem contagem dupla)", () => {
  const mes = (extra = {}) => ({
    mes: "2026-09-01",
    receita_assinaturas: 100,
    pagamentos_pagos: 2,
    taxas_gateway: 4,
    pagamentos_sem_liquido: 0,
    receita_horas_extras: 20,
    reembolsos: 10,
    ia_estimado_usd: { anthropic: 2, elevenlabs: 1 },
    lancamentos: [],
    orcamento: {},
    pagantes: 2,
    ativos: 4,
    ...extra,
  });
  const forn = (extra) => ({ id: "f1", nome: "Servidor", categoria: "hospedagem", moeda: "BRL", valor_fixo_mensal: 50, inicio_cobranca: "2026-01-01", criado_em: "2026-01-01", status: "ativo", provedor_ia: null, ...extra });

  test("sem faturas: IA estimada pelo consumo × PTAX; receita líquida", () => {
    const [l] = montarDemonstrativo([mes()], [], 5);
    assert.equal(l.receitaBrutaC, 12000);
    assert.equal(l.receitaLiquidaC, 12000 - 1000 - 400);
    assert.equal(l.iaC, 1500); // (2 + 1) × 5
    assert.equal(l.natureza, "estimado");
    assert.equal(l.resultadoC, 10600 - 1500);
  });

  test("fatura da Anthropic substitui a estimativa dela (não soma as duas)", () => {
    const anthropic = forn({ id: "fa", nome: "Anthropic", categoria: "modelos_linguagem", valor_fixo_mensal: null, provedor_ia: "anthropic" });
    const [l] = montarDemonstrativo(
      [mes({ lancamentos: [{ fornecedor_id: "fa", categoria: "modelos_linguagem", tipo: "variavel", natureza: "confirmado", valor_brl: 12 }] })],
      [anthropic],
      5,
    );
    // Anthropic: R$ 12,00 (fatura) + ElevenLabs: 1 × 5 = R$ 5,00 (consumo)
    assert.equal(l.iaC, 1700);
    assert.deepEqual(l.iaDetalhe.find((d) => d.provedor === "anthropic"), { provedor: "anthropic", fonte: "fatura", valorC: 1200 });
  });

  test("plano fixo do provedor (previsto) substitui a estimativa por consumo", () => {
    const eleven = forn({ id: "fe", nome: "ElevenLabs", categoria: "sintese_voz", moeda: "USD", valor_fixo_mensal: 22, provedor_ia: "elevenlabs" });
    const [l] = montarDemonstrativo([mes()], [eleven], 5);
    const d = l.iaDetalhe.find((x) => x.provedor === "elevenlabs");
    assert.equal(d.fonte, "previsto");
    assert.equal(d.valorC, 11000); // US$ 22 × 5
    assert.equal(l.iaC, 1000 + 11000); // anthropic por consumo + plano
  });

  test("valor fixo entra como previsto só sem lançamento e a partir do início", () => {
    const f = forn({});
    const [comPrevisto] = montarDemonstrativo([mes()], [f], 5);
    assert.equal(comPrevisto.fixosEstimadosC, 5000);
    const [comFatura] = montarDemonstrativo([mes({ lancamentos: [{ fornecedor_id: "f1", categoria: "hospedagem", tipo: "fixo", natureza: "confirmado", valor_brl: 52 }] })], [f], 5);
    assert.equal(comFatura.fixosEstimadosC, 0);
    assert.equal(comFatura.fixosConfirmadosC, 5200);
    const [antes] = montarDemonstrativo([mes()], [forn({ inicio_cobranca: "2026-10-01" })], 5);
    assert.equal(antes.fixosEstimadosC, 0);
    const [cancelado] = montarDemonstrativo([mes()], [forn({ status: "cancelado" })], 5);
    assert.equal(cancelado.fixosEstimadosC, 0);
  });

  test("tudo confirmado → resultado confirmado; sem líquido do Asaas → parcial", () => {
    const anthropic = forn({ id: "fa", categoria: "modelos_linguagem", valor_fixo_mensal: null, provedor_ia: "anthropic" });
    const eleven = forn({ id: "fe", categoria: "sintese_voz", valor_fixo_mensal: null, provedor_ia: "elevenlabs" });
    const lanc = [
      { fornecedor_id: "fa", categoria: "modelos_linguagem", tipo: "variavel", natureza: "confirmado", valor_brl: 10 },
      { fornecedor_id: "fe", categoria: "sintese_voz", tipo: "variavel", natureza: "confirmado", valor_brl: 5 },
    ];
    assert.equal(montarDemonstrativo([mes({ lancamentos: lanc })], [anthropic, eleven], 5)[0].natureza, "confirmado");
    assert.equal(montarDemonstrativo([mes({ lancamentos: lanc, pagamentos_sem_liquido: 1 })], [anthropic, eleven], 5)[0].natureza, "parcial");
  });

  test("mês sem nenhum dado aparece como 'sem dados', não como confirmado", () => {
    const [l] = montarDemonstrativo([mes({ receita_assinaturas: 0, receita_horas_extras: 0, reembolsos: 0, taxas_gateway: 0, ia_estimado_usd: {} })], [], 5);
    assert.equal(l.natureza, "sem_dados");
  });

  test("sem câmbio: custo de IA fica vazio (não inventa taxa)", () => {
    const [l] = montarDemonstrativo([mes()], [], null);
    assert.equal(l.iaC, null);
    assert.equal(l.resultadoC, null);
    assert.equal(l.semCambio, true);
  });

  test("fornecedor em euro sem taxa fica de fora e sinaliza", () => {
    const [l] = montarDemonstrativo([mes()], [forn({ moeda: "EUR" })], 5);
    assert.equal(l.fixosEstimadosC, 0);
    assert.equal(l.semCambio, true);
  });

  test("ponto de equilíbrio", () => {
    const [l] = montarDemonstrativo([mes()], [forn({ valor_fixo_mensal: 300 })], 5);
    // líquida 106,00 − variáveis (IA 15,00) = 91,00 ÷ 2 pagantes = 45,50; fixos 300 → 7 pagantes
    const r = pontoDeEquilibrio(l);
    assert.equal(r.contribuicaoC, 4550);
    assert.equal(r.pagantesNecessarios, 7);
    const [sem] = montarDemonstrativo([mes({ pagantes: 0 })], [], 5);
    assert.equal(pontoDeEquilibrio(sem).pagantesNecessarios, null);
  });

  test("alertas de orçamento em 80% e 100%", () => {
    const [l] = montarDemonstrativo([mes({ orcamento: { total: 20, hospedagem: 60 } })], [forn({})], 5);
    const alertas = alertasDeOrcamento(l);
    const total = alertas.find((a) => a.categoria === "total");
    assert.equal(total.nivel, "critico"); // custo 65,00 > 20,00
    const hosp = alertas.find((a) => a.categoria === "hospedagem");
    assert.equal(hosp.nivel, "atencao"); // 50 de 60 = 83%
  });
});

describe("assinaturas: cancelamento e LTV", () => {
  test("sem cancelamentos não inventa churn nem LTV", () => {
    assert.equal(churnMensal(0, 10), null);
    assert.equal(ltvEstimadoC(5000, null), null);
  });

  test("churn mensal e LTV estimados", () => {
    const churn = churnMensal(3, 9); // 3 em 90 dias sobre base 12 → 1/12 por mês
    assert.equal(Math.round(churn * 1000), 83);
    assert.equal(ltvEstimadoC(6000, churn), 72000);
  });
});

describe("segurança e histórico (estático)", () => {
  test("lançamento nunca é apagado, só cancelado com motivo; escrita auditada", () => {
    const d = ler("src/lib/financeiro/dados.ts");
    assert.equal(/from\("lancamentos_custo"\)\.delete/.test(d), false);
    for (const acao of ["custo.lancar", "custo.cancelar", "fornecedor.criar", "fornecedor.editar", "orcamento.salvar"]) assert.ok(d.includes(acao), acao);
  });

  test("só geral ou financeiro alteram custos", () => {
    assert.match(ler("src/app/admin/custos/actions.ts"), /f === "geral" \|\| f === "financeiro"/);
  });

  test("funções do banco só para o servidor; tabelas sem escrita direta", () => {
    const sql = ler("supabase/migrations/0024_admin_custos_financeiro.sql");
    for (const fn of ["admin_financeiro_mensal", "admin_margens", "admin_alertas_custos", "admin_assinaturas_resumo"]) {
      assert.match(sql, new RegExp(`revoke all on function public\\.${fn}[^;]*from public, anon, authenticated`), fn);
    }
    assert.equal(/for (insert|update|delete|all)/i.test(sql), false, "nenhuma policy de escrita");
  });
});
