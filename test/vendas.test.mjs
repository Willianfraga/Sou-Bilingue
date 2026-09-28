// Página de vendas: conteúdo editável (validação/XSS), rastreio de campanha
// e regras de honestidade (sem promessa que o produto não cumpre).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTEUDO_PADRAO,
  depoimentosParaTexto,
  normalizarConteudo,
  perguntasParaTexto,
  textoParaDepoimentos,
  textoParaPerguntas,
} from "../src/lib/vendas/conteudo.ts";
import { anexarCampanha, eventoPermitido, extrairCampanha, planoValido } from "../src/lib/vendas/rastreio.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("conteúdo editável", () => {
  test("sem conteúdo no banco, usa o padrão completo", () => {
    assert.deepEqual(normalizarConteudo(null), CONTEUDO_PADRAO);
    assert.deepEqual(normalizarConteudo("lixo"), CONTEUDO_PADRAO);
  });

  test("remove HTML e limita tamanho (proteção contra XSS)", () => {
    const c = normalizarConteudo({ heroTitulo: '<script>alert(1)</script>Oi', heroSubtitulo: "x".repeat(900) });
    assert.equal(c.heroTitulo.includes("<"), false);
    assert.equal(c.heroSubtitulo.length, 320);
  });

  test("campo obrigatório vazio volta ao padrão", () => {
    const c = normalizarConteudo({ ctaPrincipal: "   ", heroTitulo: "" });
    assert.equal(c.ctaPrincipal, CONTEUDO_PADRAO.ctaPrincipal);
    assert.equal(c.heroTitulo, CONTEUDO_PADRAO.heroTitulo);
  });

  test("e-mail e WhatsApp de suporte são validados", () => {
    assert.equal(normalizarConteudo({ suporteEmail: "nao-e-email" }).suporteEmail, "");
    assert.equal(normalizarConteudo({ suporteEmail: "ajuda@soubilingue.com.br" }).suporteEmail, "ajuda@soubilingue.com.br");
    assert.equal(normalizarConteudo({ suporteWhatsapp: "+55 (11) 99999-9999" }).suporteWhatsapp, "5511999999999");
    assert.equal(normalizarConteudo({ suporteWhatsapp: "123" }).suporteWhatsapp, "");
  });

  test("perguntas e depoimentos: ida e volta pelo formato de texto do admin", () => {
    const perguntas = [{ pergunta: "Funciona no celular?", resposta: "Sim." }, { pergunta: "Posso cancelar?", resposta: "Fale com o suporte." }];
    assert.deepEqual(textoParaPerguntas(perguntasParaTexto(perguntas)), perguntas);
    const deps = [{ nome: "Ana", contexto: "aluna de inglês", texto: "Perdi a vergonha de falar." }];
    assert.deepEqual(textoParaDepoimentos(depoimentosParaTexto(deps)), deps);
  });

  test("depoimento sem nome ou sem texto é descartado", () => {
    const c = normalizarConteudo({ depoimentos: [{ nome: "", texto: "x" }, { nome: "Bia", texto: "" }] });
    assert.deepEqual(c.depoimentos, []);
  });

  test("padrão não traz depoimentos nem promessas falsas", () => {
    assert.deepEqual(CONTEUDO_PADRAO.depoimentos, []);
    const tudo = JSON.stringify(CONTEUDO_PADRAO).toLowerCase();
    for (const proibido of ["grátis", "gratuit", "garantia", "sem cartão", "comprovado", "fluente em"]) {
      assert.equal(tudo.includes(proibido), false, proibido);
    }
  });
});

describe("campanha e eventos", () => {
  test("extrai UTM, src e sck; ignora o resto (inclusive cupom)", () => {
    const c = extrairCampanha(new URLSearchParams("utm_source=ig&utm_campaign=escola_x&src=qr1&sck=abc&coupon=escola10&email=a@b.c"));
    assert.deepEqual(c, { utm_source: "ig", utm_campaign: "escola_x", src: "qr1", sck: "abc" });
  });

  test("valores perigosos são limpos", () => {
    const c = extrairCampanha({ utm_source: '"><script>x</script>', utm_term: "a".repeat(300) });
    assert.equal(c.utm_source.includes("<"), false);
    assert.equal(c.utm_term.length, 100);
  });

  test("anexa a campanha ao link sem sobrescrever o que já existe", () => {
    assert.equal(anexarCampanha("/cadastro", { utm_source: "ig", sck: "X" }), "/cadastro?utm_source=ig&sck=X");
    assert.equal(anexarCampanha("/cadastro?plano=premium&utm_source=site", { utm_source: "ig" }), "/cadastro?plano=premium&utm_source=site");
    assert.equal(anexarCampanha("/cadastro", {}), "/cadastro");
  });

  test("só eventos conhecidos; plano precisa existir", () => {
    assert.equal(eventoPermitido("pagina_vista"), true);
    assert.equal(eventoPermitido("apagar_tudo"), false);
    assert.equal(planoValido("premium", ["essencial", "premium"]), "premium");
    assert.equal(planoValido("gratis", ["essencial", "premium"]), undefined);
  });

  test("navegador não consegue registrar compra: só o webhook", () => {
    assert.match(ler("src/app/api/eventos/route.ts"), /corpo\.nome === "compra_confirmada"/);
    assert.match(ler("src/app/api/webhooks/asaas/route.ts"), /registrarEventoFunil\(\{ nome: "compra_confirmada"/);
  });
});

describe("página de vendas (estático)", () => {
  const pagina = ler("src/app/page.tsx");

  test("sem promessas que o produto não cumpre", () => {
    for (const proibido of [/7 dias grátis/i, /sem cartão/i, /gratuitamente/i, /método comprovado/i, /garantia de/i]) {
      assert.equal(proibido.test(pagina), false, String(proibido));
    }
  });

  test("'cancele quando quiser' só aparece porque o cancelamento pelo app existe", () => {
    assert.match(pagina, /Cancele quando quiser, pelo próprio app/);
    assert.match(ler("src/app/assinatura/actions.ts"), /cancelarAssinaturaDoAluno\(sessao\.userId/);
  });

  test("vídeo só entra quando cadastrado; senão, a demonstração", () => {
    assert.match(pagina, /\{video \? <VideoAula video=\{video\}[^}]*\/> : <DemoConversa/);
  });

  test("depoimentos: aprovados pelos alunos + manuais, no máximo 9", () => {
    assert.match(pagina, /\[\.\.\.aprovados, \.\.\.c\.depoimentos\]\.slice\(0, 9\)/);
  });

  test("preços vêm do banco e o plano leva o nome ao cadastro", () => {
    assert.match(pagina, /getPlanos\(\)/);
    assert.match(pagina, /href=\{`\$\{CADASTRO\}\?plano=\$\{p\.id\}`\}/);
    assert.match(pagina, /data-evento="plano_selecionado"/);
  });

  test("depoimentos só aparecem se houver conteúdo real", () => {
    assert.match(pagina, /\{depoimentos\.length > 0 && \(/);
  });

  test("links do rodapé existem (termos e privacidade)", () => {
    assert.match(pagina, /href="\/termos"/);
    assert.match(pagina, /href="\/privacidade"/);
    assert.equal(/href="#"/.test(pagina), false);
    const mid = ler("src/middleware.ts");
    for (const rota of ['"/termos"', '"/privacidade"', '"/api/eventos"']) assert.ok(mid.includes(rota), rota);
  });

  test("animações respeitam movimento reduzido", () => {
    const css = ler("src/app/globals.css");
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(ler("src/components/vendas/Animacoes.tsx"), /prefers-reduced-motion: reduce/);
  });

  test("admin da página exige papel de admin e o banco confere de novo", () => {
    assert.match(ler("src/app/admin/pagina-de-vendas/actions.ts"), /await requirePapel\("admin"\)/);
    const sql = ler("supabase/migrations/0016_pagina_de_vendas_e_funil.sql");
    assert.match(sql, /for update using \(app\.is_admin\(\)\) with check \(app\.is_admin\(\)\)/);
    assert.match(sql, /on public\.eventos_funil for select using \(app\.is_admin\(\)\)/);
  });
});
