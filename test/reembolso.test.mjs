// Reembolso: prazo de 7 dias (CDC art. 49) em horário de Brasília, motivo
// opcional/obrigatório, estados que não retrocedem, eventos do Asaas e a
// política exibida nos lugares certos. Política: docs/refund-policy.md.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRAZO_ARREPENDIMENTO_DIAS,
  dataEmBrasilia,
  dentroDoPrazo,
  fimDoPrazo,
  gerarProtocolo,
  podeMudar,
  statusDoEventoAsaas,
  validarPedidoDeReembolso,
} from "../src/lib/billing/regras-reembolso.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("prazo de 7 dias", () => {
  test("são 7 dias corridos", () => assert.equal(PRAZO_ARREPENDIMENTO_DIAS, 7));

  test("pago em 10/09 → vale até 17/09 23:59:59 de Brasília", () => {
    assert.equal(fimDoPrazo("2026-09-10").toISOString(), "2026-09-18T02:59:59.999Z");
  });

  test("dentro do prazo (dia 3)", () => {
    assert.equal(dentroDoPrazo("2026-09-10", new Date("2026-09-13T15:00:00-03:00")), true);
  });

  test("exatamente no limite ainda vale; 1 ms depois não", () => {
    const limite = fimDoPrazo("2026-09-10");
    assert.equal(dentroDoPrazo("2026-09-10", limite), true);
    assert.equal(dentroDoPrazo("2026-09-10", new Date(limite.getTime() + 1)), false);
  });

  test("depois do prazo (dia 8)", () => {
    assert.equal(dentroDoPrazo("2026-09-10", new Date("2026-09-18T09:00:00-03:00")), false);
  });

  test("fuso: 23h30 de 17/09 em Brasília já é 18/09 em UTC e ainda está no prazo", () => {
    const agora = new Date("2026-09-18T02:30:00Z");
    assert.equal(dataEmBrasilia(agora), "2026-09-17");
    assert.equal(dentroDoPrazo("2026-09-10", agora), true);
  });

  test("virada de mês e de ano", () => {
    assert.equal(dataEmBrasilia(fimDoPrazo("2026-09-28")), "2026-10-05");
    assert.equal(dataEmBrasilia(fimDoPrazo("2026-12-29")), "2027-01-05");
  });

  test("aceita data com horário (usa só o dia)", () => {
    assert.equal(fimDoPrazo("2026-09-10T20:00:00Z").getTime(), fimDoPrazo("2026-09-10").getTime());
  });
});

describe("motivo do pedido", () => {
  test("dentro do prazo o motivo é opcional", () => {
    const r = validarPedidoDeReembolso({ dentroDoPrazo: true, motivo: "", comentario: "" });
    assert.deepEqual(r, { ok: true, motivo: null, comentario: null });
  });

  test("depois do prazo o motivo é obrigatório", () => {
    const r = validarPedidoDeReembolso({ dentroDoPrazo: false, motivo: "", comentario: "quero" });
    assert.equal(r.ok, false);
  });

  test("motivo fora da lista não conta (não dá para inventar motivo)", () => {
    assert.equal(validarPedidoDeReembolso({ dentroDoPrazo: false, motivo: "Hackeado", comentario: null }).ok, false);
  });

  test("cobrança duplicada depois do prazo é aceita para análise", () => {
    const r = validarPedidoDeReembolso({ dentroDoPrazo: false, motivo: "Cobrança indevida ou duplicada", comentario: "Paguei 2x" });
    assert.equal(r.ok, true);
    assert.equal(r.motivo, "Cobrança indevida ou duplicada");
  });

  test("comentário é limpo e cortado", () => {
    const r = validarPedidoDeReembolso({ dentroDoPrazo: true, motivo: null, comentario: `<b>oi</b>\n${"x".repeat(2000)}` });
    assert.equal(r.comentario.includes("<"), false);
    assert.equal(r.comentario.length, 1000);
  });
});

describe("estados do reembolso", () => {
  test("solicitado não é reembolsado: só o evento do Asaas leva a REFUNDED", () => {
    assert.equal(statusDoEventoAsaas("PAYMENT_REFUNDED"), "REFUNDED");
    assert.equal(statusDoEventoAsaas("PAYMENT_PARTIALLY_REFUNDED"), "REFUNDED");
    assert.equal(statusDoEventoAsaas("PAYMENT_REFUND_IN_PROGRESS"), "PROCESSING");
    assert.equal(statusDoEventoAsaas("PAYMENT_REFUND_DENIED"), "FAILED");
    assert.equal(statusDoEventoAsaas("PAYMENT_CONFIRMED"), null);
  });

  test("evento repetido não muda nada", () => {
    assert.equal(podeMudar("PROCESSING", "PROCESSING"), false);
    assert.equal(podeMudar("REFUNDED", "REFUNDED"), false);
  });

  test("evento fora de ordem não faz o status voltar", () => {
    assert.equal(podeMudar("REFUNDED", "PROCESSING"), false);
    assert.equal(podeMudar("PROCESSING", "REQUESTED"), false);
    assert.equal(podeMudar("APPROVED", "UNDER_REVIEW"), false);
  });

  test("depois de enviado ao provedor, o admin não nega mais", () => {
    assert.equal(podeMudar("PROCESSING", "REJECTED"), false);
    assert.equal(podeMudar("PROCESSING", "APPROVED"), false);
  });

  test("finais: reembolsado e negado não mudam mais", () => {
    for (const para of ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "FAILED"]) {
      assert.equal(podeMudar("REFUNDED", para), false, para);
      assert.equal(podeMudar("REJECTED", para), false, para);
    }
  });

  test("caminho normal avança", () => {
    assert.equal(podeMudar("REQUESTED", "PROCESSING"), true);
    assert.equal(podeMudar("UNDER_REVIEW", "APPROVED"), true);
    assert.equal(podeMudar("UNDER_REVIEW", "REJECTED"), true);
    assert.equal(podeMudar("APPROVED", "PROCESSING"), true);
    assert.equal(podeMudar("PROCESSING", "REFUNDED"), true);
    assert.equal(podeMudar("PROCESSING", "FAILED"), true);
  });

  test("falha pode ser reprocessada", () => {
    assert.equal(podeMudar("FAILED", "PROCESSING"), true);
    assert.equal(podeMudar("FAILED", "REFUNDED"), true);
  });

  test("protocolo legível com a data de Brasília", () => {
    const p = gerarProtocolo(new Date("2026-09-28T01:00:00Z"), "ab12cd34-0000");
    assert.equal(p, "RB-20260927-AB12CD");
  });
});

describe("integração no código", () => {
  test("webhook trata os eventos de estorno e não regride pagamento estornado", () => {
    const w = ler("src/app/api/webhooks/asaas/route.ts");
    assert.match(w, /aplicarEventoDeEstorno\(payment\.id, evento\.event\)/);
    assert.match(w, /status === "estornado"\) return false/);
    assert.match(w, /atual\?\.data_pagamento \?\?/, "reenvio não empurra a data do 1º pagamento");
  });

  test("ações do aluno usam só o id da sessão", () => {
    const a = ler("src/app/assinatura/actions.ts");
    assert.match(a, /solicitarReembolso\(sessao\.userId/);
    assert.match(a, /cancelarAssinaturaDoAluno\(sessao\.userId/);
    assert.equal(/formData\.get\("(valor|aluno|prazo|status)/.test(a), false, "valor, aluno, prazo e status nunca vêm do formulário");
    assert.match(a, /signInWithPassword/, "reembolso imediato pede a senha de novo");
  });

  test("cancelar renovação e pedir reembolso são botões separados", () => {
    const p = ler("src/app/assinatura/page.tsx");
    assert.match(p, /action=\{cancelarMinhaAssinatura\}/);
    assert.match(p, /action=\{pedirReembolso\}/);
    assert.match(p, /Cancelar renovação/);
    assert.match(p, /Solicitar reembolso/);
  });

  test("ações do admin exigem papel admin e justificativa", () => {
    assert.match(ler("src/app/admin/reembolsos/actions.ts"), /requireArea\("reembolsos"\)/);
    assert.match(ler("src/lib/billing/reembolso.ts"), /justificativa \(mínimo 5 caracteres\)/);
  });

  test("política aparece na página de vendas, no checkout, nos termos e na assinatura", () => {
    assert.match(ler("src/lib/vendas/conteudo.ts"), /7 dias corridos/);
    assert.match(ler("src/app/page.tsx"), /7 dias após o 1º pagamento/);
    assert.match(ler("src/app/checkout/page.tsx"), /7 dias corridos/);
    assert.match(ler("src/app/termos/page.tsx"), /id="cancelamento"/);
    assert.match(ler("src/app/assinatura/page.tsx"), /dentro do prazo de sete dias/);
  });

  test("nunca diz que nenhum reembolso é possível", () => {
    for (const f of ["src/app/termos/page.tsx", "src/app/assinatura/page.tsx", "src/lib/vendas/conteudo.ts", "src/app/checkout/page.tsx"]) {
      assert.equal(/nenhum reembolso|não há reembolso em nenhum|sem direito a reembolso/i.test(ler(f)), false, f);
    }
  });
});
