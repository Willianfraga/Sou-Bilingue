// Integração com o banco real — Fase C: fornecedor, lançamento em dólar com
// câmbio registrado, cancelamento sem apagar, orçamento, demonstrativo e
// bloqueio de acesso direto do aluno. Usa o mês 01/2020 (sem dados reais) e
// apaga tudo no fim.   npm run test:integracao
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios.js");

process.env.NEXT_PUBLIC_SUPABASE_URL ??= ENV.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ENV.service;

const pular = configurado ? false : "sem credenciais do Supabase no .env.local";

test("financeiro no banco", { skip: pular }, async (t) => {
  const F = await import("../src/lib/financeiro/dados.ts");
  const adm = admin();
  const { data: umAdmin } = await adm.from("admin_funcoes").select("admin_id").limit(1).single();
  const adminId = umAdmin.admin_id;
  const criados = { fornecedores: [], lancamentos: [] };
  const aluno = await criarAlunoTemporario("fin");
  t.after(async () => {
    if (criados.lancamentos.length) await adm.from("lancamentos_custo").delete().in("id", criados.lancamentos);
    if (criados.fornecedores.length) await adm.from("fornecedores").delete().in("id", criados.fornecedores);
    await adm.from("orcamentos").delete().eq("competencia", "2020-01-01");
    await adm.from("admin_auditoria").delete().or(`entidade_id.in.(${[...criados.fornecedores, ...criados.lancamentos, "2020-01-01"].join(",")})`);
    await removerAluno(aluno);
  });

  let fornecedorId;
  await t.test("cadastra fornecedor com valor fixo em dólar", async () => {
    const r = await F.salvarFornecedor(adminId, null, { nome: "Teste Servidor 2020", categoria: "servidores", tipo_cobranca: "fixo", moeda: "USD", valor_fixo_mensal: "10,00", inicio_cobranca: "2020-01-01", status: "ativo" }, "");
    assert.equal(r.ok, true);
    fornecedorId = r.id;
    criados.fornecedores.push(fornecedorId);
  });

  let lancId;
  await t.test("lançamento em dólar guarda valor original, taxa, data e fonte", async () => {
    const r = await F.criarLancamento(adminId, { fornecedorId, categoria: "servidores", descricao: "Fatura teste", competencia: "2020-01", valor: "12,00", moeda: "USD", taxa: "5,0000", natureza: "confirmado" });
    assert.equal(r.ok, true);
    lancId = r.id;
    criados.lancamentos.push(lancId);
    const { data } = await adm.from("lancamentos_custo").select("*").eq("id", lancId).single();
    assert.equal(Number(data.valor_original), 12);
    assert.equal(data.moeda, "USD");
    assert.equal(Number(data.taxa_cambio), 5);
    assert.equal(Number(data.valor_brl), 60);
    assert.equal(data.fonte_cambio, "Informada pelo administrador");
    assert.equal(data.natureza, "confirmado");
  });

  await t.test("demonstrativo: fatura confirmada substitui o previsto do cadastro", async () => {
    const { linhas } = await F.getDemonstrativo("2020-01-01", "2020-01-01");
    const l = linhas[0];
    assert.equal(l.fixosConfirmadosC, 6000);
    assert.equal(l.previstos.some((p) => p.fornecedor === "Teste Servidor 2020"), false);
  });

  await t.test("cancelar exige motivo e não apaga; o previsto volta a valer", async () => {
    assert.equal((await F.cancelarLancamento(adminId, lancId, "")).ok, false);
    assert.equal((await F.cancelarLancamento(adminId, lancId, "Lançado em duplicidade")).ok, true);
    const { data } = await adm.from("lancamentos_custo").select("cancelado_em, motivo_cancelamento").eq("id", lancId).single();
    assert.ok(data.cancelado_em);
    assert.equal((await F.cancelarLancamento(adminId, lancId, "de novo")).ok, false, "não cancela duas vezes");
    const { linhas } = await F.getDemonstrativo("2020-01-01", "2020-01-01");
    assert.equal(linhas[0].fixosConfirmadosC, 0);
    assert.ok(linhas[0].previstos.some((p) => p.fornecedor === "Teste Servidor 2020") || linhas[0].semCambio);
  });

  await t.test("orçamento salva, aparece no mês e registra auditoria", async () => {
    assert.equal((await F.salvarOrcamento(adminId, "2020-01", { total: "100,00", servidores: "40,00" })).ok, true);
    const { linhas } = await F.getDemonstrativo("2020-01-01", "2020-01-01");
    assert.equal(linhas[0].orcamento.total, 10000);
    assert.equal((await F.salvarOrcamento(adminId, "2020-01", { servidores: "" })).ok, true, "vazio remove");
    const { data } = await adm.from("orcamentos").select("categoria").eq("competencia", "2020-01-01");
    assert.deepEqual(data.map((d) => d.categoria), ["total"]);
    const { data: aud } = await adm.from("admin_auditoria").select("acao").eq("entidade_id", "2020-01-01");
    assert.ok(aud.some((a) => a.acao === "orcamento.salvar"));
  });

  await t.test("resumos e alertas respondem", async () => {
    const resumo = await F.getResumoAssinaturas();
    assert.ok(Array.isArray(resumo.planos));
    assert.ok(Array.isArray(await F.getAlertasDeCusto(5)));
    const m = await F.getMargens(new Date(Date.now() - 90 * 86_400_000), new Date());
    assert.ok(Array.isArray(m.por_plano));
  });

  await t.test("aluno não lê custos, fornecedores nem orçamento, e não chama as funções", async () => {
    const c = await clienteLogado(aluno);
    for (const tabela of ["fornecedores", "lancamentos_custo", "orcamentos"]) {
      const { data } = await c.from(tabela).select("*");
      assert.deepEqual(data ?? [], [], tabela);
    }
    const ins = await c.from("lancamentos_custo").insert({ categoria: "outros", tipo_custo: "fixo", descricao: "x", competencia: "2020-01-01", valor_original: 1, moeda: "BRL", taxa_cambio: 1, data_cambio: "2020-01-01", fonte_cambio: "x", valor_brl: 1, natureza: "confirmado" });
    assert.ok(ins.error);
    assert.ok((await c.rpc("admin_financeiro_mensal", { p_de: "2020-01-01", p_ate: "2020-01-01" })).error);
  });
});
