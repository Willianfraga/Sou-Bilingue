// Regras comerciais: preço da 1ª mensalidade, voz por plano, texto das
// horas, divisão da fala da voz do navegador e pontos de integração.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DESCONTO_PRIMEIRA_MENSALIDADE,
  formatarPreco,
  horasPorSemana,
  nomeDeExibicao,
  planoTemVozPremium,
  temDescontoNaPrimeira,
  valorPrimeiraMensalidade,
} from "../src/lib/billing/planos.ts";
import { dividirFalaPorIdioma } from "../src/lib/voice/navegador.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("preço da 1ª mensalidade", () => {
  test("planos mensais têm 50% de desconto, com centavos corretos", () => {
    assert.equal(DESCONTO_PRIMEIRA_MENSALIDADE, 50);
    assert.equal(valorPrimeiraMensalidade(59.8, "essencial"), 29.9);
    assert.equal(valorPrimeiraMensalidade(109.8, "fluencia"), 54.9);
    assert.equal(valorPrimeiraMensalidade(169.8, "premium"), 84.9);
  });

  test("plano de teste não tem desconto", () => {
    assert.equal(temDescontoNaPrimeira("teste_7dias"), false);
    assert.equal(valorPrimeiraMensalidade(9.9, "teste_7dias"), 9.9);
  });

  test("formatação em reais", () => {
    assert.equal(formatarPreco(59.8), "R$ 59,80");
    assert.equal(formatarPreco(29.9), "R$ 29,90");
  });

  test("migration 0014 aplica +R$ 9,90 em cada mensalidade e mantém o teste", () => {
    const sql = ler("supabase/migrations/0014_precos_e_primeira_mensalidade.sql");
    assert.match(sql, /preco = 59\.80\s+where nome = 'essencial'/);
    assert.match(sql, /preco = 109\.80 where nome = 'fluencia'/);
    assert.match(sql, /preco = 169\.80 where nome = 'premium'/);
    assert.equal(sql.includes("teste_7dias"), false);
    assert.equal(/horas_mensais/.test(sql), false, "horas não mudam");
  });
});

describe("voz por plano", () => {
  test("todos os planos usam a voz premium (ElevenLabs)", () => {
    assert.equal(planoTemVozPremium("essencial"), true);
    assert.equal(planoTemVozPremium("teste_7dias"), true);
    assert.equal(planoTemVozPremium("fluencia"), true);
    assert.equal(planoTemVozPremium("premium"), true);
  });

  test("sem assinatura ativa, nada de voz premium", () => {
    assert.equal(planoTemVozPremium(null), false);
    assert.equal(planoTemVozPremium(undefined), false);
  });

  test("a rota de voz recusa o plano sem voz premium antes de chamar a ElevenLabs", () => {
    const rota = ler("src/app/api/aula/voz/route.ts");
    const bloqueio = rota.indexOf("alunoTemVozPremium(sessao.userId)");
    const chamada = rota.indexOf("sintetizarVoz({");
    assert.ok(bloqueio > 0 && chamada > bloqueio);
  });

  test("a aula não chama a voz premium quando o plano não tem", () => {
    const chat = ler("src/components/aluno/AulaChat.tsx");
    assert.match(chat, /if \(!vozPremium\) \{\s*falarNoNavegador\(texto\);\s*return;/);
    assert.match(ler("src/app/aluno/aula/page.tsx"), /vozPremium=\{await alunoTemVozPremium\(sessao\.userId\)\}/);
  });
});

describe("voz do navegador: português e idioma estudado", () => {
  test("trecho entre aspas vai no idioma estudado; o resto em pt-BR", () => {
    const t = dividirFalaPorIdioma('Muito bem! Uma forma mais natural seria "I went to the market". Quer tentar?', "en-US");
    assert.deepEqual(t, [
      { texto: "Muito bem! Uma forma mais natural seria", idioma: "pt-BR" },
      { texto: "I went to the market", idioma: "en-US" },
      { texto: ". Quer tentar?", idioma: "pt-BR" },
    ]);
  });

  test("aspas curvas também funcionam; contrações não viram exemplo", () => {
    const t = dividirFalaPorIdioma("Diga “Where is it?” sem medo, don't worry", "en-US");
    assert.equal(t[1].texto, "Where is it?");
    assert.equal(t[1].idioma, "en-US");
    assert.equal(t[2].idioma, "pt-BR");
    assert.ok(t[2].texto.includes("don't worry"));
  });

  test("sem aspas, tudo em português; texto vazio não gera fala", () => {
    assert.deepEqual(dividirFalaPorIdioma("Tudo certo?", "es-ES"), [{ texto: "Tudo certo?", idioma: "pt-BR" }]);
    assert.deepEqual(dividirFalaPorIdioma("   ", "es-ES"), []);
  });
});

describe("texto dos planos", () => {
  test("horas por semana aproximadas em 15 min", () => {
    assert.equal(horasPorSemana(12), "~2h45/semana");
    assert.equal(horasPorSemana(20), "~4h30/semana");
    assert.equal(horasPorSemana(30), "~7h/semana");
  });

  test("nomes de exibição", () => {
    assert.equal(nomeDeExibicao("fluencia"), "Fluência");
    assert.equal(nomeDeExibicao("essencial"), "Essencial");
    assert.equal(nomeDeExibicao("novo_plano"), "Novo_plano");
  });

  test("botões da página de vendas levam ao cadastro (visitante ainda não tem conta)", () => {
    const pagina = ler("src/app/page.tsx");
    assert.match(pagina, /const CADASTRO = "\/cadastro";/);
    assert.equal(pagina.includes('href="/cadastro/onboarding"'), false, "não aponta para a página que só redireciona");
    assert.match(ler("src/app/cadastro/page.tsx"), /router\.push\("\/checkout"\)/);
  });

  test("página de vendas lê os planos do banco, sem preço fixo no código", () => {
    const pagina = ler("src/app/page.tsx");
    assert.match(pagina, /getPlanos\(\)/);
    assert.equal(/R\$ \d/.test(pagina), false, "nenhum preço escrito à mão");
  });
});

describe("cobrança da 1ª mensalidade e cache (estático)", () => {
  test("checkout cria cobrança avulsa com desconto e não a recorrente", () => {
    const sub = ler("src/lib/billing/subscription.ts");
    assert.match(sub, /externalReference: `soubilingue:primeira:\$\{subscription\.id\}`/);
    const trechoDesconto = sub.slice(sub.indexOf("if (comDesconto)"), sub.indexOf("// 5b."));
    assert.equal(trechoDesconto.includes("criarAssinaturaRecorrente"), false);
  });

  test("webhook: recorrente só depois de pago, uma única vez, e confere a cobrança", () => {
    const wh = ler("src/app/api/webhooks/asaas/route.ts");
    assert.match(wh, /soubilingue:primeira:/);
    assert.match(wh, /asaas_primeira_cobranca_id !== payment\.id/);
    assert.match(wh, /if \(!assinatura\.asaas_subscription_id && plano/);
    assert.match(wh, /proximo\.setMonth\(proximo\.getMonth\(\) \+ 1\)/);
  });

  test("chat marca a última mensagem para cache", () => {
    const rota = ler("src/app/api/aula/chat/route.ts");
    assert.match(rota, /i === mensagens\.length - 1[\s\S]*cache_control: \{ type: "ephemeral" \}/);
  });
});
