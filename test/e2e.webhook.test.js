// Webhook do Asaas pelo servidor local (npm run dev/start): token obrigatório,
// registro sem dados pessoais, reenvio duplicado e reprocessamento de evento
// que falhou. Usa ids de evento fictícios e apaga os registros no fim.
// Não confirma pagamento nenhum: os eventos não apontam para compras reais.
//   npm run test:e2e
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { ENV, configurado, admin, servidorNoAr } = require("./suporte/alunos-temporarios");

test("webhook do Asaas", async (t) => {
  if (!configurado || !ENV.asaasWebhookToken) return t.skip("sem credenciais no .env.local");
  if (!(await servidorNoAr())) return t.skip(`servidor fora do ar em ${ENV.baseUrl}`);

  const ids = [];
  t.after(async () => {
    if (ids.length) await admin().from("webhook_events").delete().eq("provider", "asaas").in("event_id", ids);
  });
  const enviar = (evento, token = ENV.asaasWebhookToken) =>
    fetch(`${ENV.baseUrl}/api/webhooks/asaas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "asaas-access-token": token } : {}) },
      body: JSON.stringify(evento),
    });
  const registro = async (id) =>
    (await admin().from("webhook_events").select("status, tentativas, payload").eq("event_id", id).single()).data;

  await t.test("sem token ou com token errado: 401", async () => {
    assert.equal((await enviar({ id: "x", event: "PAYMENT_CREATED" }, null)).status, 401);
    assert.equal((await enviar({ id: "x", event: "PAYMENT_CREATED" }, "token-errado")).status, 401);
  });

  await t.test("evento guardado sem dados do comprador; reenvio não repete", async () => {
    const id = `evt_teste_${crypto.randomUUID()}`;
    ids.push(id);
    const evento = {
      id,
      event: "PAYMENT_CREATED",
      payment: { id: `pay_${id}`, value: 29.9, customer: "cus_x", name: "Fulano", email: "f@x.com", cpfCnpj: "00000000000" },
    };
    assert.equal((await enviar(evento)).status, 200);
    const r = await registro(id);
    assert.equal(r.status, "processado");
    const guardado = JSON.stringify(r.payload);
    for (const pessoal of ["Fulano", "f@x.com", "00000000000", "cus_x"]) assert.equal(guardado.includes(pessoal), false, pessoal);

    const repetido = await (await enviar(evento)).json();
    assert.equal(repetido.duplicate, true);
    assert.equal((await registro(id)).tentativas, 1);
  });

  await t.test("evento que falhou é reprocessado no reenvio", async () => {
    const id = `evt_teste_${crypto.randomUUID()}`;
    ids.push(id);
    // 1ª mensalidade de uma assinatura que não existe: falha de propósito
    // ("Assinatura não encontrada"), sem tocar em compra real nenhuma.
    const evento = {
      id,
      event: "PAYMENT_CONFIRMED",
      payment: { id: `pay_${id}`, value: 1, externalReference: `soubilingue:primeira:${crypto.randomUUID()}` },
    };
    assert.equal((await enviar(evento)).status, 500);
    assert.equal((await registro(id)).status, "erro");

    assert.equal((await enviar(evento)).status, 500, "reprocessou (e falhou de novo, como esperado)");
    const r = await registro(id);
    assert.equal(r.status, "erro");
    assert.equal(r.tentativas, 2);
  });
});
