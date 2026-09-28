// Integração com o banco real: fluxo de reembolso de ponta a ponta (pedido,
// estorno no provedor, webhook repetido/fora de ordem, análise do admin,
// falha e reprocessamento, RLS). O Asaas é um servidor falso local — nada
// sai para o Asaas de verdade. Alunos descartáveis, apagados no fim.
//   npm run test:integracao
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ENV, configurado, admin, criarAlunoTemporario, removerAluno, clienteLogado } = require("./suporte/alunos-temporarios.js");

process.env.NEXT_PUBLIC_SUPABASE_URL ??= ENV.url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= ENV.service;

const pular = configurado ? false : "sem credenciais do Supabase no .env.local";

// Asaas falso: estorno de cobrança cujo id contém "falha" dá erro na 1ª vez.
function asaasFalso() {
  const chamadas = [];
  const falhou = new Set();
  const servidor = http.createServer((req, res) => {
    chamadas.push(`${req.method} ${req.url}`);
    const m = req.url.match(/^\/payments\/([^/]+)\/refund$/);
    res.setHeader("content-type", "application/json");
    if (req.method === "POST" && m) {
      if (m[1].includes("falha") && !falhou.has(m[1])) {
        falhou.add(m[1]);
        res.statusCode = 400;
        return res.end(JSON.stringify({ errors: [{ code: "invalid_action", description: "Saldo insuficiente (teste)" }] }));
      }
      return res.end(JSON.stringify({ id: m[1], status: "REFUNDED" }));
    }
    if (req.method === "DELETE") return res.end(JSON.stringify({ deleted: true, id: "x" }));
    res.statusCode = 404;
    res.end(JSON.stringify({ errors: [{ code: "not_found" }] }));
  });
  return new Promise((ok) =>
    servidor.listen(0, "127.0.0.1", () => ok({ servidor, chamadas, url: `http://127.0.0.1:${servidor.address().port}` })),
  );
}

const diasAtras = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

test("reembolso no banco", { skip: pular }, async (t) => {
  const asaas = await asaasFalso();
  process.env.ASAAS_API_URL = asaas.url;
  process.env.ASAAS_API_KEY = "chave-falsa-de-teste";

  const R = await import("../src/lib/billing/reembolso.ts");
  const adm = admin();
  const alunos = [];
  t.after(async () => {
    const ids = alunos.map((a) => a.id);
    const { data: pedidos } = await adm.from("reembolsos").select("id").in("aluno_id", ids);
    if (pedidos?.length) await adm.from("reembolso_eventos").delete().in("reembolso_id", pedidos.map((p) => p.id));
    await adm.from("reembolsos").delete().in("aluno_id", ids);
    for (const a of alunos) await removerAluno(a);
    asaas.servidor.close();
  });

  const { data: plano } = await adm.from("planos").select("id").eq("nome", "essencial").single();
  // Aluno com assinatura ativa (com id no Asaas) e 1º pagamento há N dias.
  async function alunoComPagamento(rotulo, pagoHaDias, idPagamento) {
    const aluno = await criarAlunoTemporario(rotulo);
    alunos.push(aluno);
    const pago = diasAtras(pagoHaDias);
    const { data: sub, error } = await adm
      .from("subscriptions")
      .insert({ aluno_id: aluno.id, plano_id: plano.id, status: "ativa", ciclo_inicio: pago, ciclo_fim: pago, horas_total: 12, horas_utilizadas: 0, asaas_subscription_id: `sub_teste_${rotulo}_${aluno.id}` })
      .select("id")
      .single();
    if (error) throw error;
    const asaasPaymentId = `${idPagamento}_${aluno.id}`;
    await adm.from("payments").insert({ aluno_id: aluno.id, subscription_id: sub.id, tipo: "assinatura", valor: 29.9, status: "pago", data_pagamento: pago, asaas_payment_id: asaasPaymentId });
    return { aluno, sub, asaasPaymentId };
  }
  const pedido = async (id) => (await adm.from("reembolsos").select("*").eq("id", id).single()).data;
  const eventos = async (id) => (await adm.from("reembolso_eventos").select("*").eq("reembolso_id", id).order("id")).data;
  const refundsDe = (pid) => asaas.chamadas.filter((c) => c === `POST /payments/${pid}/refund`).length;

  const A = await alunoComPagamento("reemb-a", 2, "pay_ok");
  let pedidoA;

  await t.test("dentro dos 7 dias: sem motivo, gera protocolo, cancela a renovação e envia o estorno", async () => {
    const r = await R.solicitarReembolso(A.aluno.id, { motivo: "", comentario: "" });
    assert.equal(r.ok, true);
    pedidoA = r.reembolso;
    assert.match(pedidoA.protocolo, /^RB-\d{8}-[A-Z0-9]{6}$/);
    assert.equal(pedidoA.dentro_do_prazo, true);
    assert.equal(Number(pedidoA.valor), 29.9, "valor vem do pagamento no banco");
    assert.equal((await pedido(pedidoA.id)).status, "PROCESSING", "solicitado ≠ reembolsado");
    assert.equal(refundsDe(A.asaasPaymentId), 1);
    const { data: sub } = await adm.from("subscriptions").select("status, cancelamento_solicitado_em").eq("id", A.sub.id).single();
    assert.ok(sub.cancelamento_solicitado_em, "renovação cancelada");
    assert.equal(sub.status, "ativa", "acesso só termina com o estorno confirmado");
  });

  await t.test("pedir de novo devolve o mesmo pedido e não estorna duas vezes", async () => {
    const r = await R.solicitarReembolso(A.aluno.id, { motivo: "", comentario: "" });
    assert.equal(r.ok, true);
    assert.equal(r.jaExistia, true);
    assert.equal(r.reembolso.id, pedidoA.id);
    assert.equal(refundsDe(A.asaasPaymentId), 1);
  });

  await t.test("webhook: confirmado encerra o acesso; repetido e fora de ordem não regridem", async () => {
    await R.aplicarEventoDeEstorno(A.asaasPaymentId, "PAYMENT_REFUNDED");
    assert.equal((await pedido(pedidoA.id)).status, "REFUNDED");
    await R.aplicarEventoDeEstorno(A.asaasPaymentId, "PAYMENT_REFUNDED");
    await R.aplicarEventoDeEstorno(A.asaasPaymentId, "PAYMENT_REFUND_IN_PROGRESS");
    assert.equal((await pedido(pedidoA.id)).status, "REFUNDED");
    const ev = await eventos(pedidoA.id);
    assert.equal(ev.filter((e) => e.tipo === "evento_ignorado").length, 2);
    const { data: pag } = await adm.from("payments").select("status").eq("asaas_payment_id", A.asaasPaymentId).single();
    assert.equal(pag.status, "estornado", "histórico financeiro mantido, só muda o status");
    const { data: sub } = await adm.from("subscriptions").select("status").eq("id", A.sub.id).single();
    assert.equal(sub.status, "cancelada");
  });

  const B = await alunoComPagamento("reemb-b", 10, "pay_ok");
  let pedidoB;

  await t.test("depois dos 7 dias: motivo obrigatório; duplicidade vai para análise sem estorno automático", async () => {
    const semMotivo = await R.solicitarReembolso(B.aluno.id, { motivo: "", comentario: "" });
    assert.equal(semMotivo.ok, false);
    const r = await R.solicitarReembolso(B.aluno.id, { motivo: "Cobrança indevida ou duplicada", comentario: "Cobrado duas vezes" });
    assert.equal(r.ok, true);
    pedidoB = r.reembolso;
    assert.equal(pedidoB.dentro_do_prazo, false);
    assert.equal(pedidoB.status, "UNDER_REVIEW");
    assert.equal(refundsDe(B.asaasPaymentId), 0, "nada de estorno automático");
    const { data: sub } = await adm.from("subscriptions").select("status, cancelamento_solicitado_em").eq("id", B.sub.id).single();
    assert.equal(sub.cancelamento_solicitado_em, null, "pedido fora do prazo não cancela sozinho");
  });

  await t.test("admin: decisão exige justificativa e fica auditada com quem e quando", async () => {
    const adminId = A.aluno.id; // qualquer profile serve como autor no teste; o papel é checado na action
    const sem = await R.decidirReembolso(pedidoB.id, "aprovar", adminId, "ok");
    assert.equal(sem.ok, false);
    const r = await R.decidirReembolso(pedidoB.id, "aprovar", adminId, "Duplicidade confirmada no extrato do Asaas");
    assert.equal(r.ok, true);
    assert.equal((await pedido(pedidoB.id)).status, "PROCESSING");
    assert.equal(refundsDe(B.asaasPaymentId), 1);
    const aprovacao = (await eventos(pedidoB.id)).find((e) => e.status_novo === "APPROVED");
    assert.equal(aprovacao.ator, "admin");
    assert.equal(aprovacao.ator_id, adminId);
    assert.equal(aprovacao.observacao, "Duplicidade confirmada no extrato do Asaas");
    assert.ok(aprovacao.criado_em);
    const negarDepois = await R.decidirReembolso(pedidoB.id, "negar", adminId, "Mudei de ideia");
    assert.equal(negarDepois.ok, false, "não volta atrás depois de enviado");
  });

  const C = await alunoComPagamento("reemb-c", 1, "pay_falha");

  await t.test("falha do Asaas: pedido fica FAILED com o erro e pode ser reprocessado", async () => {
    const r = await R.solicitarReembolso(C.aluno.id, { motivo: "Preço", comentario: "" });
    assert.equal(r.ok, true);
    const falho = await pedido(r.reembolso.id);
    assert.equal(falho.status, "FAILED");
    assert.match(falho.erro, /Saldo insuficiente/);
    const again = await R.solicitarReembolso(C.aluno.id, { motivo: "", comentario: "" });
    assert.equal(again.reembolso.id, r.reembolso.id, "aluno não cria outro pedido");
    const rep = await R.reprocessarReembolso(r.reembolso.id, A.aluno.id, "Saldo recarregado");
    assert.equal(rep.ok, true);
    assert.equal((await pedido(r.reembolso.id)).status, "PROCESSING");
  });

  await t.test("estorno feito direto no painel do Asaas também fica registrado", async () => {
    const D = await alunoComPagamento("reemb-d", 20, "pay_ok");
    await R.aplicarEventoDeEstorno(D.asaasPaymentId, "PAYMENT_REFUNDED");
    const { data } = await adm.from("reembolsos").select("status, dentro_do_prazo").eq("asaas_payment_id", D.asaasPaymentId).single();
    assert.equal(data.status, "REFUNDED");
    assert.equal(data.dentro_do_prazo, false);
    await R.aplicarEventoDeEstorno("pay_que_nao_existe", "PAYMENT_REFUNDED"); // não é deste app: ignora sem erro
  });

  await t.test("RLS: aluno vê só os próprios pedidos, não cria nem altera, e não lê a auditoria", async () => {
    const a = await clienteLogado(A.aluno);
    const b = await clienteLogado(B.aluno);
    const { data: meus } = await a.from("reembolsos").select("id").eq("aluno_id", A.aluno.id);
    assert.equal(meus.length, 1);
    const { data: alheios } = await b.from("reembolsos").select("id").eq("aluno_id", A.aluno.id);
    assert.deepEqual(alheios, []);
    const forjado = await b.from("reembolsos").insert({ protocolo: "RB-X", aluno_id: B.aluno.id, asaas_payment_id: "x", valor: 1, dentro_do_prazo: true, prazo_final: new Date().toISOString(), status: "REFUNDED" });
    assert.ok(forjado.error, "aluno não grava pedido direto no banco");
    const muda = await a.from("reembolsos").update({ status: "REFUNDED" }).eq("id", pedidoA.id).select("id");
    assert.ok(muda.error || muda.data.length === 0);
    const { data: trilha } = await a.from("reembolso_eventos").select("id").eq("reembolso_id", pedidoA.id);
    assert.deepEqual(trilha, []);
  });
});
