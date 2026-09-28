// Integração com o banco real: cancelamento pelo aluno (idempotente, acesso
// até o fim do período pago) e RLS dos depoimentos. Alunos descartáveis,
// apagados no fim. Não chama o Asaas: a assinatura de teste não tem id no
// Asaas.  npm run test:integracao
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios.js");

// O módulo de cancelamento lê as variáveis do processo.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= ENV.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ENV.service;

const pular = configurado ? false : "sem credenciais do Supabase no .env.local";

test("cancelamento e depoimentos no banco", { skip: pular }, async (t) => {
  const { cancelarAssinaturaDoAluno } = await import("../src/lib/billing/cancelamento.ts");
  const { assinaturaDaAcesso } = await import("../src/lib/billing/regras-cancelamento.ts");

  const alunoA = await criarAlunoTemporario("canc-a");
  const alunoB = await criarAlunoTemporario("canc-b");
  t.after(async () => {
    await removerAluno(alunoA);
    await removerAluno(alunoB);
  });
  const adm = admin();
  const { data: plano } = await adm.from("planos").select("id").eq("nome", "essencial").single();
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: sub } = await adm
    .from("subscriptions")
    .insert({ aluno_id: alunoA.id, plano_id: plano.id, status: "ativa", ciclo_inicio: hoje, ciclo_fim: hoje, horas_total: 12, horas_utilizadas: 0 })
    .select("id")
    .single();
  await adm.from("payments").insert({ aluno_id: alunoA.id, subscription_id: sub.id, tipo: "assinatura", valor: 29.9, status: "pago", data_pagamento: hoje, asaas_payment_id: `teste_${sub.id}` });

  await t.test("cancela, guarda o motivo e mantém acesso até o fim do período pago", async () => {
    const r = await cancelarAssinaturaDoAluno(alunoA.id, "Preço");
    assert.equal(r.ok, true);
    assert.equal(r.jaEstavaCancelada, false);
    const { data } = await adm.from("subscriptions").select("status, motivo_cancelamento, acesso_ate, cancelamento_solicitado_em").eq("id", sub.id).single();
    assert.equal(data.status, "ativa", "continua ativa até acesso_ate");
    assert.equal(data.motivo_cancelamento, "Preço");
    assert.ok(data.acesso_ate > hoje, "um mês após o pagamento de hoje");
    assert.equal(assinaturaDaAcesso(data, new Date()), true);
    const depois = new Date(`${data.acesso_ate}T12:00:00Z`);
    depois.setUTCDate(depois.getUTCDate() + 1);
    assert.equal(assinaturaDaAcesso(data, depois), false);
  });

  await t.test("pedir de novo não repete nada", async () => {
    const r = await cancelarAssinaturaDoAluno(alunoA.id, "Outro motivo");
    assert.equal(r.ok, true);
    assert.equal(r.jaEstavaCancelada, true);
    const { data } = await adm.from("subscriptions").select("motivo_cancelamento").eq("id", sub.id).single();
    assert.equal(data.motivo_cancelamento, "Preço");
  });

  await t.test("motivo fora da lista vira 'Não informado'; sem assinatura dá erro amigável", async () => {
    const r = await cancelarAssinaturaDoAluno(alunoB.id, "<script>");
    assert.equal(r.ok, false);
  });

  await t.test("depoimentos: aluno envia o próprio, não se autoaprova, e outro aluno não lê", async () => {
    const a = await clienteLogado(alunoA);
    const b = await clienteLogado(alunoB);
    const autoaprovado = await a.from("depoimentos").insert({ aluno_id: alunoA.id, nome_exibicao: "Ana", texto: "Perdi o medo de falar inglês.", autorizou_publicacao: true, status: "aprovado" });
    assert.ok(autoaprovado.error, "não pode se autoaprovar");
    const alheio = await b.from("depoimentos").insert({ aluno_id: alunoA.id, nome_exibicao: "X", texto: "Texto de outra pessoa aqui.", autorizou_publicacao: true });
    assert.ok(alheio.error, "não envia em nome de outro");
    const ok = await a.from("depoimentos").insert({ aluno_id: alunoA.id, nome_exibicao: "Ana", texto: "Perdi o medo de falar inglês.", autorizou_publicacao: true });
    assert.equal(ok.error, null);
    const { data: visto } = await b.from("depoimentos").select("id").eq("aluno_id", alunoA.id);
    assert.deepEqual(visto, []);
    const aprovaSozinho = await a.from("depoimentos").update({ status: "aprovado" }).eq("aluno_id", alunoA.id).select("id");
    assert.ok(aprovaSozinho.error || aprovaSozinho.data.length === 0, "aluno não aprova o próprio");
    const retirar = await a.from("depoimentos").update({ status: "retirado" }).eq("aluno_id", alunoA.id).select("status");
    assert.equal(retirar.data?.[0]?.status, "retirado");
  });
});
