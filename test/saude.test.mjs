// Verificador de saúde (npm run saude) e agente de manutenção.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  avaliarAnthropic,
  avaliarContasDeTeste,
  avaliarGit,
  avaliarIa,
  avaliarReembolsos,
  avaliarRetencao,
  avaliarSite,
  avaliarWebhooks,
  resumir,
} from "../scripts/saude/regras.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");
const agora = new Date("2026-09-29T12:00:00Z");
const atras = (horas) => new Date(agora.getTime() - horas * 3_600_000).toISOString();

describe("regras de saúde", () => {
  test("site fora do ar é problema", () => {
    const [ok, fora] = avaliarSite([
      { nome: "A", status: 200, esperado: 200 },
      { nome: "B", status: null, esperado: 200 },
    ]);
    assert.equal(ok.nivel, "ok");
    assert.equal(fora.nivel, "problema");
  });

  test("aviso do Asaas travado é problema; com erro é aviso", () => {
    const itens = avaliarWebhooks(
      [
        { event_type: "PAYMENT_CONFIRMED", status: "processando", atualizado_em: atras(1) },
        { event_type: "PAYMENT_REFUNDED", status: "erro", atualizado_em: atras(2) },
      ],
      agora,
    );
    assert.equal(itens.find((i) => i.nivel === "problema").area, "pagamentos");
    assert.ok(itens.some((i) => i.nivel === "aviso" && i.texto.includes("PAYMENT_REFUNDED")));
  });

  test("sem crédito na Anthropic é problema (pelo tráfego e pelo teste direto)", () => {
    const itens = avaliarIa([{ provider: "anthropic", status: "erro", erro: "Your credit balance is too low" }], null, agora);
    assert.ok(itens.some((i) => i.nivel === "problema" && /créditos/.test(i.texto)));
    assert.equal(avaliarAnthropic({ status: 400, mensagem: "Your credit balance is too low to access" }).nivel, "problema");
    assert.equal(avaliarAnthropic({ ok: true }).nivel, "ok");
    assert.equal(avaliarAnthropic({ status: 401, mensagem: "invalid x-api-key" }).nivel, "problema");
    assert.equal(avaliarAnthropic({ status: 529 }).nivel, "aviso");
    assert.equal(avaliarAnthropic({ semChave: true }).nivel, "aviso");
  });

  test("taxa de erro de IA: 20% com 5+ chamadas é problema; poucos erros são aviso", () => {
    const muitos = Array.from({ length: 10 }, (_, i) => ({ provider: "elevenlabs", status: i < 3 ? "erro" : "ok" }));
    assert.ok(avaliarIa(muitos, null, agora).some((i) => i.nivel === "problema"));
    const poucos = [{ provider: "anthropic", status: "erro" }, ...Array.from({ length: 9 }, () => ({ provider: "anthropic", status: "ok" }))];
    assert.ok(avaliarIa(poucos, null, agora).some((i) => i.nivel === "aviso"));
  });

  test("IA parada há 7+ dias gera aviso", () => {
    assert.equal(avaliarIa([], atras(24 * 8), agora)[0].nivel, "aviso");
    assert.equal(avaliarIa([], atras(24 * 2), agora)[0].nivel, "ok");
  });

  test("reembolsos: falha é problema; parados demais são aviso", () => {
    const itens = avaliarReembolsos(
      [
        { protocolo: "RB-1", status: "FAILED", atualizado_em: atras(1) },
        { protocolo: "RB-2", status: "UNDER_REVIEW", atualizado_em: atras(24 * 4) },
        { protocolo: "RB-3", status: "PROCESSING", atualizado_em: atras(24 * 11) },
        { protocolo: "RB-4", status: "UNDER_REVIEW", atualizado_em: atras(5) },
      ],
      agora,
    );
    assert.equal(itens.length, 3);
    assert.equal(itens[0].nivel, "problema");
  });

  test("retenção, contas de teste e Git", () => {
    assert.equal(avaliarRetencao(3).nivel, "problema");
    assert.equal(avaliarRetencao(0).nivel, "ok");
    assert.equal(avaliarContasDeTeste(2).nivel, "aviso");
    assert.equal(avaliarGit({ alteracoesPendentes: 0, aFrenteDoGithub: 0 })[0].nivel, "ok");
    assert.equal(avaliarGit({ alteracoesPendentes: 1, aFrenteDoGithub: 2 }).length, 2);
  });

  test("resumo: problema faz sair com código 1", () => {
    assert.deepEqual(resumir([{ nivel: "ok" }]), { problemas: 0, avisos: 0, texto: "Tudo certo", codigoDeSaida: 0 });
    assert.equal(resumir([{ nivel: "problema" }, { nivel: "aviso" }]).codigoDeSaida, 1);
  });
});

describe("verificador e agente (estático)", () => {
  test("verificador só lê: nenhuma escrita no banco", () => {
    const s = ler("scripts/saude.mjs");
    assert.equal(/\.(insert|update|upsert|delete)\(/.test(s), false);
    assert.equal(/console\.log\([^)]*(KEY|TOKEN|SECRET)/i.test(s), false, "nunca imprime chaves");
  });

  test("agente de manutenção tem as regras essenciais", () => {
    const a = ler(".claude/agents/manutencao.md");
    assert.match(a, /^---\r?\nname: manutencao\r?\n/);
    for (const regra of ["PÚBLICO", "npm run saude", "Pare e peça aprovação", "anonimização", "docs/ESTADO_ATUAL.md"]) assert.ok(a.includes(regra), regra);
  });
});
