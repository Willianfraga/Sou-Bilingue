// Integração com o banco real: registro de conversas e consumo de IA,
// métricas do painel (public.admin_metricas) e bloqueios de acesso direto
// (aluno não grava consumo, não lê conversas nem auditoria). Aluno
// descartável, apagado no fim (com as conversas, em cascata).
//   npm run test:integracao
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios.js");

process.env.NEXT_PUBLIC_SUPABASE_URL ??= ENV.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ENV.service;

const pular = configurado ? false : "sem credenciais do Supabase no .env.local";

test("painel: conversas, consumo e métricas no banco", { skip: pular }, async (t) => {
  const { registrarFalaDoAluno, registrarRespostaDoTutor } = await import("../src/lib/ai/conversas.ts");
  const { recordAIUsage } = await import("../src/lib/ai/usage.ts");
  const adm = admin();
  const aluno = await criarAlunoTemporario("painel");
  t.after(async () => {
    await adm.from("ai_usage_events").delete().eq("aluno_id", aluno.id);
    await removerAluno(aluno);
  });
  const { data: tutor } = await adm.from("tutores").select("id").limit(1).single();
  const inicio = new Date(Date.now() - 60_000).toISOString();

  let conversaId;
  await t.test("fala e resposta ficam na mesma conversa; a próxima fala continua nela", async () => {
    const r1 = await registrarFalaDoAluno({ alunoId: aluno.id, tutorId: tutor.id, idioma: "ingles", texto: "Hello, teacher!" });
    assert.ok(r1?.conversaId);
    conversaId = r1.conversaId;
    const mensagemId = await registrarRespostaDoTutor({ conversaId, alunoId: aluno.id, texto: "Hi! How are you?", status: "ok", modelo: "claude-haiku-4-5-20251001", versaoPrompt: 2, latenciaMs: 850 });
    assert.ok(mensagemId);
    await recordAIUsage({ alunoId: aluno.id, provider: "anthropic", service: "llm", model: "claude-haiku-4-5-20251001", inputTokens: 1_000_000, outputTokens: 100_000, tutorId: tutor.id, conversaId, mensagemId, latenciaMs: 850 });
    const r2 = await registrarFalaDoAluno({ alunoId: aluno.id, tutorId: tutor.id, idioma: "ingles", texto: "I am fine." });
    assert.equal(r2.conversaId, conversaId);
  });

  await t.test("falha da IA também é registrada", async () => {
    await registrarRespostaDoTutor({ conversaId, alunoId: aluno.id, texto: null, status: "erro", erro: "HTTP 529: overloaded" });
    await recordAIUsage({ alunoId: aluno.id, provider: "anthropic", service: "llm", model: "claude-haiku-4-5-20251001", tutorId: tutor.id, conversaId, status: "erro", erro: "HTTP 529: overloaded" });
    const { data } = await adm.from("ai_usage_events").select("status, estimated_cost_usd, custo_origem, preco_referencia").eq("aluno_id", aluno.id).order("created_at");
    assert.equal(data.length, 2);
    assert.equal(Number(data[0].estimated_cost_usd), 1.5, "1M entrada × US$1 + 100k saída × US$5");
    assert.equal(data[0].custo_origem, "estimado");
    assert.ok(data[0].preco_referencia.itens.length >= 2, "guarda o preço usado");
    assert.equal(data[1].status, "erro");
  });

  await t.test("métricas do período enxergam conversa, mensagens, erro e custo", async () => {
    const { data, error } = await adm.rpc("admin_metricas", { p_de: inicio, p_ate: new Date(Date.now() + 60_000).toISOString(), p_idioma: null, p_plano: null, p_tutor: tutor.id });
    assert.equal(error, null);
    assert.ok(data.ia.conversas >= 1);
    assert.ok(data.ia.mensagens_aluno >= 2);
    assert.ok(data.ia.chamadas_erro >= 1);
    assert.ok(Number(data.ia.custo_usd) >= 1.5);
    const serie = await adm.rpc("admin_serie_diaria", { p_de: inicio, p_ate: new Date(Date.now() + 60_000).toISOString(), p_idioma: null, p_plano: null, p_tutor: null });
    assert.equal(serie.error, null);
    assert.ok(Array.isArray(serie.data) && serie.data.length >= 1);
  });

  await t.test("aluno não grava consumo, não lê conversas, auditoria nem métricas", async () => {
    const c = await clienteLogado(aluno);
    const forjado = await c.from("ai_usage_events").insert({ aluno_id: aluno.id, provider: "anthropic", service: "llm", model: "x", estimated_cost_usd: 999 });
    assert.ok(forjado.error, "insert direto bloqueado");
    const { data: msgs } = await c.from("mensagens").select("id").eq("aluno_id", aluno.id);
    assert.deepEqual(msgs ?? [], []);
    const { data: convs } = await c.from("conversas").select("id");
    assert.deepEqual(convs ?? [], []);
    const { data: aud } = await c.from("admin_auditoria").select("id");
    assert.deepEqual(aud ?? [], []);
    const rpc = await c.rpc("admin_metricas", { p_de: inicio, p_ate: new Date().toISOString() });
    assert.ok(rpc.error, "função de métricas só para o servidor");
  });
});

test("painel: suspender, reativar e anonimizar aluno", { skip: pular }, async (t) => {
  const { suspenderAluno, reativarAluno, anonimizarAluno, detalheAluno } = await import("../src/lib/admin/alunos.ts");
  const adm = admin();
  const aluno = await criarAlunoTemporario("anon");
  const { data: umAdmin } = await adm.from("admin_funcoes").select("admin_id").limit(1).single();
  t.after(async () => {
    await adm.from("admin_auditoria").delete().eq("entidade_id", aluno.id);
    await adm.auth.admin.deleteUser(aluno.id);
  });

  await t.test("suspensão bloqueia o login e exige motivo", async () => {
    assert.equal((await suspenderAluno(umAdmin.admin_id, aluno.id, "")).ok, false);
    assert.equal((await suspenderAluno(umAdmin.admin_id, aluno.id, "Abuso de uso")).ok, true);
    const tentativa = await clienteLogado(aluno).then(() => "entrou", (e) => String(e.message));
    assert.notEqual(tentativa, "entrou");
    assert.equal((await reativarAluno(umAdmin.admin_id, aluno.id, "Revisado com o aluno")).ok, true);
    await clienteLogado(aluno); // volta a entrar
  });

  await t.test("anonimização: recusa com renovação ativa; depois apaga dados pessoais e guarda pagamentos", async () => {
    const { data: plano } = await adm.from("planos").select("id").eq("nome", "essencial").single();
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: sub } = await adm.from("subscriptions").insert({ aluno_id: aluno.id, plano_id: plano.id, status: "ativa", ciclo_inicio: hoje, ciclo_fim: hoje, horas_total: 12, horas_utilizadas: 0 }).select("id").single();
    await adm.from("payments").insert({ aluno_id: aluno.id, subscription_id: sub.id, tipo: "assinatura", valor: 29.9, status: "pago", data_pagamento: hoje, asaas_payment_id: `teste_anon_${sub.id}` });
    await adm.from("student_memories").insert({ aluno_id: aluno.id, chave: "hobby", valor: "futebol" });

    assert.equal((await anonimizarAluno(umAdmin.admin_id, aluno.id, "Pedido do titular por e-mail em 29/09", "errado")).ok, false, "exige digitar ANONIMIZAR");
    const bloqueado = await anonimizarAluno(umAdmin.admin_id, aluno.id, "Pedido do titular por e-mail em 29/09", "ANONIMIZAR");
    assert.equal(bloqueado.ok, false, "renovação ativa bloqueia");

    await adm.from("subscriptions").update({ cancelamento_solicitado_em: new Date().toISOString(), acesso_ate: hoje }).eq("id", sub.id);
    const r = await anonimizarAluno(umAdmin.admin_id, aluno.id, "Pedido do titular por e-mail em 29/09", "ANONIMIZAR");
    assert.equal(r.ok, true);

    const d = await detalheAluno(aluno.id);
    assert.equal(d.perfil.nome, "Aluno anonimizado");
    assert.match(d.perfil.email, /@soubilingue\.invalid$/);
    const { data: mem } = await adm.from("student_memories").select("id").eq("aluno_id", aluno.id);
    assert.deepEqual(mem, []);
    const { data: pags } = await adm.from("payments").select("valor").eq("aluno_id", aluno.id);
    assert.equal(pags.length, 1, "pagamento continua guardado");
    const lido = await adm.auth.admin.getUserById(aluno.id);
    assert.equal(lido.error, null, "o serviço de login continua lendo o usuário anonimizado");
    const { data: aud } = await adm.from("admin_auditoria").select("acao, resultado").eq("entidade_id", aluno.id);
    assert.ok(aud.some((a) => a.acao === "aluno.anonimizar" && a.resultado === "ok"));
    assert.ok(aud.some((a) => a.acao === "aluno.suspender" && a.resultado === "ok"));
  });
});
