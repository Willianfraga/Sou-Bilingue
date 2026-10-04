// Integração com o banco real — Fase 3 (horas e créditos, migration 0025):
// sessão por conversa ativa, limite do sinal pelo relógio do servidor,
// cobrança por minuto e uma vez só, falha técnica não cobra, fechamento de
// sessões paradas, reposição, horas extras e renovação do ciclo. Também
// confere que o aluno não grava horas direto. Apaga tudo no fim.
//   npm run test:integracao
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios.js");

process.env.NEXT_PUBLIC_SUPABASE_URL ??= ENV.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ENV.service;

const pular = configurado ? false : "sem credenciais do Supabase no .env.local";
const atras = (s) => new Date(Date.now() - s * 1000).toISOString();

test("horas no banco", { skip: pular }, async (t) => {
  const S = await import("../src/lib/billing/sessoes-de-aula.ts");
  const A = await import("../src/lib/admin/alunos.ts");
  const adm = admin();
  const { data: umAdmin } = await adm.from("admin_funcoes").select("admin_id").limit(1).single();
  const { data: plano } = await adm.from("planos").select("id, horas_mensais").eq("nome", "essencial").single();
  const aluno = await criarAlunoTemporario("horas");
  let subId;
  t.after(async () => {
    await adm.from("usage_ledger").delete().eq("aluno_id", aluno.id);
    await adm.from("usage_sessions").delete().eq("aluno_id", aluno.id);
    await adm.from("hour_topups").delete().eq("aluno_id", aluno.id);
    await adm.from("ai_usage_events").delete().eq("aluno_id", aluno.id);
    await adm.from("subscriptions").delete().eq("aluno_id", aluno.id);
    await adm.from("admin_auditoria").delete().eq("entidade_id", aluno.id);
    await removerAluno(aluno);
  });

  const assinatura = async () => (await adm.from("subscriptions").select("*").eq("id", subId).single()).data;
  const sessao = async (id) => (await adm.from("usage_sessions").select("*").eq("id", id).single()).data;
  const extrato = async () => (await adm.from("usage_ledger").select("*").eq("aluno_id", aluno.id).eq("valido", true).order("criada_em")).data;

  await t.test("sem assinatura não abre sessão", async () => {
    assert.deepEqual(await S.iniciarSessaoDeAula(aluno.id), { ok: false, erro: "sem_assinatura" });
  });

  await t.test("assinatura aceita horas com minutos", async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, error } = await adm.from("subscriptions").insert({ aluno_id: aluno.id, plano_id: plano.id, status: "ativa", ciclo_inicio: hoje, ciclo_fim: hoje, horas_total: 2, horas_utilizadas: 0.5 }).select("id, horas_restantes").single();
    assert.equal(error, null);
    subId = data.id;
    assert.equal(Number(data.horas_restantes), 1.5);
  });

  let sessaoId;
  await t.test("abre a sessão e reaproveita a mesma ao recarregar a página", async () => {
    const r = await S.iniciarSessaoDeAula(aluno.id);
    assert.equal(r.ok, true);
    sessaoId = r.sessaoId;
    const r2 = await S.iniciarSessaoDeAula(aluno.id);
    assert.equal(r2.sessaoId, sessaoId);
  });

  await t.test("sinal: soma o tempo ativo, limitado pelo relógio do servidor", async () => {
    await adm.from("usage_sessions").update({ last_activity_at: atras(70) }).eq("id", sessaoId);
    let r = await S.sinalDaSessao(aluno.id, sessaoId, 500);
    assert.equal(r.ok, true);
    assert.equal((await sessao(sessaoId)).segundos_utilizados, 60, "no máximo 60 s por sinal");
    r = await S.sinalDaSessao(aluno.id, sessaoId, 60);
    assert.ok((await sessao(sessaoId)).segundos_utilizados <= 63, "sinal seguido não passa do tempo real (+2 s)");
  });

  await t.test("outro aluno não mexe na sessão", async () => {
    const r = await S.sinalDaSessao("00000000-0000-0000-0000-000000000000", sessaoId, 30);
    assert.deepEqual(r, { ok: false, erro: "sessao_encerrada" });
  });

  await t.test("encerrar: cobra por minuto, uma vez só", async () => {
    await adm.from("usage_sessions").update({ segundos_utilizados: 610 }).eq("id", sessaoId); // 10 min 10 s
    const r = await S.encerrarSessaoDeAula(aluno.id, sessaoId);
    assert.deepEqual(r, { ok: true, minutos: 10, cobrado: true });
    await S.encerrarSessaoDeAula(aluno.id, sessaoId);
    const usos = (await extrato()).filter((l) => l.tipo === "uso");
    assert.equal(usos.length, 1);
    assert.equal(usos[0].segundos, -600);
    const a = await assinatura();
    assert.ok(Math.abs(Number(a.horas_utilizadas) - (0.5 + 10 / 60)) < 0.001);
  });

  await t.test("falha técnica (tutora não respondeu) não cobra", async () => {
    const r = await S.iniciarSessaoDeAula(aluno.id);
    await adm.from("usage_sessions").update({ segundos_utilizados: 300, iniciada_em: atras(400) }).eq("id", r.sessaoId);
    await adm.from("ai_usage_events").insert({ aluno_id: aluno.id, provider: "anthropic", service: "llm", model: "teste", status: "erro", origem: "aula", erro: "teste" });
    const antes = Number((await assinatura()).horas_utilizadas);
    const fim = await S.encerrarSessaoDeAula(aluno.id, r.sessaoId);
    assert.equal(fim.cobrado, false);
    assert.equal(Number((await assinatura()).horas_utilizadas), antes);
    const l = (await extrato()).find((x) => x.referencia_externa === r.sessaoId);
    assert.equal(l.segundos, 0);
    assert.match(l.motivo, /falha técnica/);
    await adm.from("ai_usage_events").delete().eq("aluno_id", aluno.id);
  });

  await t.test("sessão sem sinal há mais de 2 min é fechada pelo servidor", async () => {
    const r = await S.iniciarSessaoDeAula(aluno.id);
    await adm.from("usage_sessions").update({ segundos_utilizados: 120, last_activity_at: atras(300) }).eq("id", r.sessaoId);
    const { error } = await adm.rpc("horas_fechar_paradas");
    assert.equal(error, null);
    const s = await sessao(r.sessaoId);
    assert.equal(s.ativo, false);
    assert.equal(new Date(s.encerrada_em).getTime() <= Date.now() - 290_000, true, "encerra no último sinal, não agora");
    assert.equal((await S.sinalDaSessao(aluno.id, r.sessaoId, 10)).ok, false);
  });

  await t.test("aluno não grava extrato nem altera sessão direto", async () => {
    const cli = await clienteLogado(aluno);
    const ins = await cli.from("usage_ledger").insert({ aluno_id: aluno.id, subscription_id: subId, tipo: "reposicao", segundos: 360000 });
    assert.ok(ins.error, "insert no extrato deve falhar");
    const { data: s } = await adm.from("usage_sessions").select("id").eq("aluno_id", aluno.id).limit(1).single();
    await cli.from("usage_sessions").update({ segundos_utilizados: 0 }).eq("id", s.id);
    assert.notEqual((await sessao(s.id)).segundos_utilizados, 0);
    const leitura = await cli.from("usage_ledger").select("id").eq("aluno_id", aluno.id);
    assert.ok(leitura.data.length > 0, "continua lendo o próprio extrato");
  });

  await t.test("reposição pelo admin: valida, soma ao ciclo e audita", async () => {
    assert.equal((await A.concederReposicao(umAdmin.admin_id, aluno.id, 1, "abc")).ok, false);
    assert.equal((await A.concederReposicao(umAdmin.admin_id, aluno.id, 500, "Motivo válido")).ok, false);
    const antes = Number((await assinatura()).horas_total);
    assert.deepEqual(await A.concederReposicao(umAdmin.admin_id, aluno.id, 1.5, "Falha do sistema em 03/10"), { ok: true });
    assert.equal(Number((await assinatura()).horas_total), antes + 1.5);
    const l = (await extrato()).find((x) => x.tipo === "reposicao");
    assert.equal(l.segundos, 5400);
    assert.equal(l.criado_por, umAdmin.admin_id);
    const { data: aud } = await adm.from("admin_auditoria").select("acao, resultado").eq("entidade_id", aluno.id).eq("acao", "aluno.conceder_horas").eq("resultado", "ok");
    assert.equal(aud.length, 1);
  });

  await t.test("horas extras pagas entram no saldo (uma vez)", async () => {
    const { data: topup } = await adm.from("hour_topups").insert({ aluno_id: aluno.id, subscription_id: subId, horas: 5, valor: 49.5, valor_unitario: 9.9, status: "pending" }).select("id").single();
    const antes = Number((await assinatura()).horas_total);
    for (let i = 0; i < 2; i++) {
      const { error } = await adm.rpc("process_topup_payment", { p_topup_id: topup.id, p_payment_id: "pay_teste_horas" });
      assert.equal(error, null);
    }
    assert.equal(Number((await assinatura()).horas_total), antes + 5);
    assert.equal((await extrato()).filter((x) => x.tipo === "recarga").length, 1);
  });

  await t.test("renovação: plano volta cheio, extras não usadas passam, uma vez por pagamento", async () => {
    // Extras do ciclo: 1,5 (reposição) + 5 (compra) = 6,5 h; saldo atual é maior que isso.
    for (let i = 0; i < 2; i++) {
      const { error } = await adm.rpc("horas_renovar_ciclo", { p_sub: subId, p_pagamento: "pay_teste_ciclo" });
      assert.equal(error, null);
    }
    const a = await assinatura();
    assert.equal(Number(a.horas_utilizadas), 0);
    assert.equal(Number(a.horas_total), plano.horas_mensais + 6.5);
    assert.equal((await extrato()).filter((x) => x.tipo === "plano").length, 1);
  });

  await t.test("sem horas não abre sessão", async () => {
    await adm.from("subscriptions").update({ horas_utilizadas: Number((await assinatura()).horas_total) }).eq("id", subId);
    assert.deepEqual(await S.iniciarSessaoDeAula(aluno.id), { ok: false, erro: "sem_horas" });
  });
});
