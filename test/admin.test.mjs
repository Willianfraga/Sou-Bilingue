// Painel administrativo — Fases A e B (docs/admin-painel.md): custo por
// token/ferramenta, períodos e fuso, permissões por função, indicadores
// (dinheiro em centavos, estimado × confirmado), CSV, auditoria sem dados
// sensíveis e proteção de todas as páginas e ações do painel.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PRECOS_PADRAO, calcularCusto, microParaTexto, paraMicro, precoVigente } from "../src/lib/ai/precos.ts";
import { diaBrasilia, inicioDoDia, resolverPeriodo, variacao } from "../src/lib/admin/periodos.ts";
import { AREAS_ADMIN, areaDoCaminho, normalizarFuncoes, podeAcessar } from "../src/lib/admin/permissoes.ts";
import { montarIndicadores, usdParaCentavos } from "../src/lib/admin/indicadores.ts";
import { formatarValor, tomDaVariacao } from "../src/lib/admin/formatar.ts";
import { paraCsv } from "../src/lib/admin/csv.ts";
import { limparParaAuditoria } from "../src/lib/admin/auditoria-limpeza.ts";
import { continuaConversa } from "../src/lib/ai/conversas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("custo de IA (tokens e ferramentas)", () => {
  test("micro-dólares exatos, sem ponto flutuante", () => {
    assert.equal(paraMicro("1.25"), 1_250_000n);
    assert.equal(paraMicro("0.1"), 100_000n);
    assert.equal(microParaTexto(1_234n), "0.001234");
    assert.equal(microParaTexto(5_000_000n), "5.000000");
  });

  test("Haiku 4.5: entrada, saída e cache", () => {
    const c = calcularCusto(
      { provider: "anthropic", model: "claude-haiku-4-5-20251001", inputTokens: 1_000_000, outputTokens: 200_000, cacheCreationTokens: 100_000, cacheReadTokens: 1_000_000 },
      PRECOS_PADRAO,
    );
    // 1,00 + 1,00 + 0,125 + 0,10
    assert.equal(c.valor, "2.225000");
    assert.equal(c.itens.length, 4);
    assert.deepEqual(c.semPreco, []);
  });

  test("0,1 + 0,2 não vira 0,30000000000000004", () => {
    const c = calcularCusto({ provider: "anthropic", model: "claude-haiku-4-5", inputTokens: 100_000, cacheReadTokens: 2_000_000 }, PRECOS_PADRAO);
    assert.equal(c.valor, "0.300000");
  });

  test("voz premium por mil caracteres e transcrição por hora", () => {
    assert.equal(calcularCusto({ provider: "elevenlabs", model: "eleven_flash_v2_5", characters: 2_000 }, PRECOS_PADRAO).valor, "0.100000");
    assert.equal(calcularCusto({ provider: "elevenlabs", model: "scribe_v2", audioSeconds: 1_800 }, PRECOS_PADRAO).valor, "0.110000");
  });

  test("modelo sem preço cadastrado: custo zero e aviso (não inventa)", () => {
    const c = calcularCusto({ provider: "anthropic", model: "outro-modelo", inputTokens: 1000 }, PRECOS_PADRAO);
    assert.equal(c.valor, "0.000000");
    assert.deepEqual(c.semPreco, ["mtok_entrada"]);
  });

  test("vale o preço vigente na data (histórico de preços)", () => {
    const tabela = [
      ...PRECOS_PADRAO,
      { provedor: "anthropic", modelo: "claude-haiku-4-5", unidade: "mtok_entrada", preco: "2.00", moeda: "USD", vigente_desde: "2030-01-01", fonte: "futuro" },
    ];
    assert.equal(precoVigente(tabela, "anthropic", "claude-haiku-4-5-x", "mtok_entrada", new Date("2026-09-29")).preco, "1.00");
    assert.equal(precoVigente(tabela, "anthropic", "claude-haiku-4-5-x", "mtok_entrada", new Date("2030-02-01")).preco, "2.00");
  });
});

describe("períodos (horário de Brasília)", () => {
  const agora = new Date("2026-09-29T15:00:00Z"); // 12:00 em Brasília

  test("dia de Brasília e meia-noite local", () => {
    assert.equal(diaBrasilia(new Date("2026-09-30T02:00:00Z")), "2026-09-29");
    assert.equal(inicioDoDia("2026-09-29").toISOString(), "2026-09-29T03:00:00.000Z");
  });

  test("hoje: desde 00:00 de Brasília; anterior = ontem até a mesma hora", () => {
    const p = resolverPeriodo({ periodo: "hoje" }, agora);
    assert.equal(p.atual.de.toISOString(), "2026-09-29T03:00:00.000Z");
    assert.equal(p.anterior.ate.toISOString(), "2026-09-28T15:00:00.000Z");
  });

  test("últimos 30 dias e período anterior do mesmo tamanho", () => {
    const p = resolverPeriodo({ periodo: "30d" }, agora);
    assert.equal(p.atual.ate.getTime() - p.atual.de.getTime(), p.anterior.ate.getTime() - p.anterior.de.getTime());
    assert.equal(p.anterior.ate.getTime(), p.atual.de.getTime());
  });

  test("mês anterior completo", () => {
    const p = resolverPeriodo({ periodo: "mes_anterior" }, agora);
    assert.equal(p.atual.de.toISOString(), "2026-08-01T03:00:00.000Z");
    assert.equal(p.atual.ate.toISOString(), "2026-09-01T03:00:00.000Z");
    assert.equal(p.anterior.de.toISOString(), "2026-07-01T03:00:00.000Z");
  });

  test("mês atual compara com o mesmo trecho do mês anterior", () => {
    const p = resolverPeriodo({ periodo: "mes" }, agora);
    assert.equal(p.atual.de.toISOString(), "2026-09-01T03:00:00.000Z");
    assert.equal(p.anterior.de.toISOString(), "2026-08-01T03:00:00.000Z");
    assert.ok(p.anterior.ate <= p.atual.de);
  });

  test("personalizado inclui o último dia; inválido volta para 30 dias", () => {
    const p = resolverPeriodo({ periodo: "personalizado", de: "2026-09-01", ate: "2026-09-10" }, agora);
    assert.equal(p.atual.ate.toISOString(), "2026-09-11T03:00:00.000Z");
    assert.equal(resolverPeriodo({ periodo: "personalizado", de: "x", ate: "2026-09-10" }, agora).periodo, "30d");
    assert.equal(resolverPeriodo({ periodo: "personalizado", de: "2026-09-10", ate: "2026-09-01" }, agora).periodo, "30d");
    assert.equal(resolverPeriodo({ periodo: "qualquer" }, agora).periodo, "30d");
  });

  test("variação: sem base não inventa percentual", () => {
    assert.equal(variacao(10, 0), null);
    assert.equal(variacao(15, 10), 50);
    assert.equal(variacao(5, 10), -50);
  });
});

describe("permissões por função", () => {
  test("administrador geral vê todas as áreas", () => {
    for (const a of AREAS_ADMIN) assert.equal(podeAcessar(["geral"], a), true, a.id);
  });

  test("sem função não vê nada", () => {
    for (const a of AREAS_ADMIN) assert.equal(podeAcessar([], a), false, a.id);
  });

  test("suporte não vê financeiro nem custos; financeiro não vê conversas", () => {
    assert.equal(podeAcessar(["suporte"], "financeiro"), false);
    assert.equal(podeAcessar(["suporte"], "custos"), false);
    assert.equal(podeAcessar(["suporte"], "reembolsos"), true);
    assert.equal(podeAcessar(["financeiro"], "conversas"), false);
    assert.equal(podeAcessar(["financeiro"], "custos"), true);
    assert.equal(podeAcessar(["moderador"], "depoimentos"), true);
    assert.equal(podeAcessar(["analista"], "logs"), true);
  });

  test("área desconhecida é negada; função inválida é descartada", () => {
    assert.equal(podeAcessar(["geral"], "nao-existe"), false);
    assert.deepEqual(normalizarFuncoes(["geral", "hacker", 1]), ["geral"]);
    assert.deepEqual(normalizarFuncoes(null), []);
  });

  test("área pelo caminho (prefixo mais longo)", () => {
    assert.equal(areaDoCaminho("/admin")?.id, "visao-geral");
    assert.equal(areaDoCaminho("/admin/reembolsos")?.id, "reembolsos");
    assert.equal(areaDoCaminho("/admin/alunos/123")?.id, "alunos");
  });
});

describe("indicadores (dinheiro, estimado × confirmado)", () => {
  const metricas = (extra = {}) => ({
    usuarios: { total_alunos: 10, novos: 4, novos_ativados: 3, novos_pagantes: 1, ativos_periodo: 5, pagantes: 2, cancelamentos: 1, ativos_30d: 6 },
    aprendizagem: { sessoes: 8, segundos: 7200, certificados: 0 },
    ia: { chamadas: 100, chamadas_erro: 5, conversas: 10, custo_usd: 2, por_origem: { aula: { custo_usd: 1.5 } } },
    financeiro: {
      receita_assinaturas: 59.8,
      bruto_com_liquido: 29.9,
      receita_liquida_informada: 28.4,
      pagamentos_sem_liquido: 1,
      pagamentos_pagos: 2,
      receita_horas_extras: 0,
      horas_extras_vendidas: 0,
      reembolsado: 0,
      mrr: 109.8,
      ...extra,
    },
  });
  const valor = (secao, id) => secao.find((i) => i.id === id);

  test("receita bruta confirmada; líquida parcial quando falta o valor do Asaas", () => {
    const s = montarIndicadores(metricas(), metricas(), 5.2);
    assert.equal(valor(s.financeiro, "receita_bruta").valor, 59.8);
    assert.equal(valor(s.financeiro, "receita_bruta").natureza, "confirmado");
    // 28,40 informado + 29,90 sem líquido
    assert.equal(valor(s.financeiro, "receita_liquida").valor, 58.3);
    assert.equal(valor(s.financeiro, "receita_liquida").natureza, "parcial");
  });

  test("custo de IA em reais pela PTAX é estimado; sem câmbio fica vazio", () => {
    const s = montarIndicadores(metricas(), metricas(), 5.2);
    assert.equal(valor(s.ia, "custo_brl").valor, 10.4);
    assert.equal(valor(s.ia, "custo_brl").natureza, "estimado");
    const semCambio = montarIndicadores(metricas(), metricas(), null);
    assert.equal(valor(semCambio.ia, "custo_brl").valor, null);
    assert.equal(valor(semCambio.financeiro, "resultado").valor, null);
  });

  test("resultado e margem em centavos", () => {
    const s = montarIndicadores(metricas(), metricas(), 5.2);
    // 58,30 − 0 − 10,40
    assert.equal(valor(s.financeiro, "resultado").valor, 47.9);
    assert.equal(Math.round(valor(s.financeiro, "margem").valor * 10) / 10, 82.2);
    assert.equal(valor(s.financeiro, "arr").valor, 1317.6);
    assert.equal(valor(s.financeiro, "ticket").valor, 29.9);
  });

  test("taxas: ativação, conversão e erro", () => {
    const s = montarIndicadores(metricas(), metricas(), 5.2);
    assert.equal(valor(s.usuarios, "ativacao").valor, 75);
    assert.equal(valor(s.usuarios, "conversao").valor, 25);
    assert.equal(valor(s.ia, "taxa_erro").valor, 5);
    assert.equal(valor(s.aprendizagem, "horas_estudo").valor, 2);
  });

  test("sem cadastros novos: taxa vazia, não zero inventado", () => {
    const m = metricas();
    m.usuarios.novos = 0;
    assert.equal(valor(montarIndicadores(m, m, 5).usuarios, "ativacao").valor, null);
  });

  test("dólar → centavos de real", () => {
    assert.equal(usdParaCentavos(0.001234, 5.2204), 1);
    assert.equal(usdParaCentavos(10, 5.2204), 5220);
  });

  test("formatação e tom (custo subir é ruim)", () => {
    assert.equal(formatarValor(null, "reais"), "—");
    assert.match(formatarValor(1234.5, "reais"), /1\.234,50/);
    assert.equal(tomDaVariacao(20, true), "ruim");
    assert.equal(tomDaVariacao(20, false), "bom");
    assert.equal(tomDaVariacao(null), "neutro");
  });
});

describe("CSV e auditoria", () => {
  test("CSV com BOM, ponto e vírgula e proteção contra fórmula", () => {
    const csv = paraCsv(["a", "b"], [["=SOMA(A1)", 'diz "oi"; tchau'], [null, { x: 1 }]]);
    assert.ok(csv.startsWith("﻿"));
    assert.match(csv, /'=SOMA\(A1\)/);
    assert.match(csv, /"diz ""oi""; tchau"/);
  });

  test("auditoria nunca guarda senha, token, chave, CPF ou cartão", () => {
    const limpo = limparParaAuditoria({ nome: "Ana", senha: "123", token: "t", apiKey: "k", cpf: "1", dados: { cartao: "4111", plano: "x" } });
    assert.deepEqual(limpo, { nome: "Ana", senha: "[oculto]", token: "[oculto]", apiKey: "[oculto]", cpf: "[oculto]", dados: { cartao: "[oculto]", plano: "x" } });
  });

  test("conversa continua até 30 minutos de pausa", () => {
    const agora = new Date("2026-09-29T12:00:00Z");
    assert.equal(continuaConversa("2026-09-29T11:40:00Z", agora), true);
    assert.equal(continuaConversa("2026-09-29T11:20:00Z", agora), false);
    assert.equal(continuaConversa(null, agora), false);
  });
});

describe("proteção do painel (estático)", () => {
  const paginas = [];
  const varrer = (dir) => {
    for (const nome of readdirSync(path.join(RAIZ, dir))) {
      const rel = `${dir}/${nome}`;
      if (statSync(path.join(RAIZ, rel)).isDirectory()) varrer(rel);
      else if (/^(page|route|actions)\.tsx?$/.test(nome)) paginas.push(rel);
    }
  };
  varrer("src/app/admin");

  test("toda página, rota e ação do painel confere a área (requireArea)", () => {
    for (const p of paginas) {
      if (p.endsWith("sem-acesso/page.tsx")) continue; // só mostra o aviso
      assert.match(ler(p), /requireArea\("[a-z-]+"\)/, p);
    }
  });

  test("banco: aluno não grava consumo de IA; métricas só pelo servidor; conversas sem acesso direto", () => {
    const m = ler("supabase/migrations/0020_admin_fundacao.sql");
    assert.match(m, /drop policy if exists "aluno registra o proprio consumo de ia"/);
    assert.equal(/create policy[^;]*on public\.(mensagens|conversas)/.test(m), false);
    const met = ler("supabase/migrations/0022_admin_metricas.sql");
    assert.match(met, /revoke all on function public\.admin_metricas[^;]*from public, anon, authenticated/);
  });

  test("falhas da IA também são registradas (aula, voz, transcrição, assistente)", () => {
    for (const r of ["src/app/api/aula/chat/route.ts", "src/app/api/aula/voz/route.ts", "src/app/api/aula/transcrever/route.ts", "src/app/api/assistente/route.ts"]) {
      assert.match(ler(r), /status: "erro"/, r);
    }
  });

  test("privacidade informa a retenção das conversas", () => {
    assert.match(ler("src/app/privacidade/page.tsx"), /90 dias/);
    assert.match(ler("supabase/migrations/0021_retencao_conversas.sql"), /apagar_textos_antigos\(90\)/);
  });
});

describe("alunos e tutores (regras)", async () => {
  const { mascararEmail } = await import("../src/lib/admin/alunos-regras.ts");
  const { validarEdicaoTutor } = await import("../src/lib/admin/tutores-regras.ts");

  test("e-mail mascarado na lista", () => {
    assert.equal(mascararEmail("willian@yahoo.com"), "wi***@yahoo.com");
    assert.equal(mascararEmail(null), "—");
  });

  test("editar tutor exige motivo e status válido; limpa HTML", () => {
    assert.equal(validarEdicaoTutor({ nome: "Clara", descricao: "", status: "ativo", motivo: "" }).ok, false);
    assert.equal(validarEdicaoTutor({ nome: "Clara", descricao: "", status: "apagado", motivo: "ajuste de texto" }).ok, false);
    const r = validarEdicaoTutor({ nome: "<b>Clara</b>", descricao: "x", status: "pausado", motivo: "revisão pedagógica" });
    assert.equal(r.ok, true);
    assert.equal(r.dados.nome.includes("<"), false);
  });

  test("ações sensíveis exigem função certa e ficam na auditoria", () => {
    const a = ler("src/app/admin/alunos/[id]/actions.ts");
    assert.match(a, /acao === "anonimizar" \? sessao\.funcoes\.includes\("geral"\)/);
    assert.match(a, /resultado: "negado"/);
    const alunos = ler("src/lib/admin/alunos.ts");
    for (const acao of ["aluno.suspender", "aluno.reativar", "aluno.anonimizar", "aluno.exportar_dados"]) assert.ok(alunos.includes(acao), acao);
    assert.match(ler("src/app/admin/alunos/[id]/page.tsx"), /acao: "aluno\.visualizar"/);
    assert.match(ler("src/lib/admin/tutores.ts"), /acao: "tutor\.editar"/);
  });

  test("anonimização preserva registros financeiros e exige renovação cancelada", () => {
    const sql = ler("supabase/migrations/0023_admin_alunos_tutores.sql");
    const fn = sql.slice(sql.indexOf("create or replace function public.admin_anonimizar_aluno"));
    assert.equal(/delete from (payments|subscriptions|reembolsos|ai_usage_events|hour_topups)/.test(fn), false);
    assert.match(fn, /Cancele a renovação antes de anonimizar/);
    assert.match(ler("src/lib/auth/guards.ts"), /profile\.suspenso_em\) return null/);
  });
});
