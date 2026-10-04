// Fase 3 — horas e créditos (docs/fase3-horas.md): regras puras e garantias
// no código (o aluno não grava horas; a confirmação só vem do webhook).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MAXIMO_POR_SINAL, PACOTES_DE_HORAS_EXTRAS, SINAL_A_CADA_MS,
  formatarHoras, minutosCobrados, precoDoPacote, rotuloDoExtrato, valorDoExtrato,
} from "../src/lib/billing/horas.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");
const migration = () => ler("supabase/migrations/0025_horas_creditos.sql");

describe("regras puras", () => {
  test("cobra por minuto, arredondando para o mais próximo", () => {
    assert.equal(minutosCobrados(0), 0);
    assert.equal(minutosCobrados(29), 0);
    assert.equal(minutosCobrados(30), 1);
    assert.equal(minutosCobrados(119), 2);
    assert.equal(minutosCobrados(3600), 60);
    assert.equal(minutosCobrados(-10), 0);
  });

  test("formata horas em h/min (entrada numeric do banco)", () => {
    assert.equal(formatarHoras(0), "0 min");
    assert.equal(formatarHoras(0.25), "15 min");
    assert.equal(formatarHoras(2), "2 h");
    assert.equal(formatarHoras("2.2500"), "2 h 15 min");
    assert.equal(formatarHoras(null), "0 min");
    assert.equal(formatarHoras(-1), "0 min");
  });

  test("pacotes e preço honestos: 5/10/20 h a R$ 9,90/h, sem desconto", () => {
    assert.deepEqual([...PACOTES_DE_HORAS_EXTRAS], [5, 10, 20]);
    assert.equal(precoDoPacote(5, 9.9), 49.5);
    assert.equal(precoDoPacote(10, 9.9), 99);
    assert.equal(precoDoPacote(20, 9.9), 198);
  });

  test("extrato: rótulos e valores", () => {
    assert.equal(rotuloDoExtrato("uso"), "Aula");
    assert.equal(rotuloDoExtrato("reposicao"), "Reposição");
    assert.equal(rotuloDoExtrato("xyz"), "Lançamento");
    assert.equal(valorDoExtrato(-1500), "−25 min");
    assert.equal(valorDoExtrato(36000), "+10 h");
    assert.equal(valorDoExtrato(0), "—");
  });

  test("sinal a cada 30 s cabe no limite do servidor (60 s por sinal)", () => {
    assert.ok(SINAL_A_CADA_MS / 1000 < MAXIMO_POR_SINAL);
    assert.match(migration(), /least\(greatest\(coalesce\(p_segundos, 0\), 0\), 60,/);
  });
});

describe("banco (migration 0025)", () => {
  test("aluno perde a permissão de gravar extrato e sessões", () => {
    const m = migration();
    for (const p of ["aluno_cria_ledger", "aluno_cria_sessoes", "aluno_atualiza_sessoes"]) {
      assert.match(m, new RegExp(`drop policy if exists "${p}"`));
    }
  });

  test("funções de horas só para o servidor", () => {
    const m = migration();
    for (const f of ["horas_iniciar_sessao", "horas_sinal", "horas_encerrar_sessao", "horas_conceder", "horas_renovar_ciclo", "horas_fechar_paradas", "process_topup_payment"]) {
      assert.ok(m.includes(`revoke all on function public.${f}(`), f);
    }
  });

  test("histórico antigo fica guardado, mas inválido", () => {
    assert.match(migration(), /update public\.usage_ledger\s+set valido = false/);
  });

  test("cada sessão cobra uma vez; cada pagamento renova uma vez", () => {
    assert.match(migration(), /usage_ledger_uso_por_sessao/);
    assert.match(migration(), /usage_ledger_plano_por_pagamento/);
  });
});

describe("app", () => {
  test("contagem nova no lugar da antiga (relógio de parede, horas cheias)", () => {
    assert.equal(existsSync(path.join(RAIZ, "src/lib/billing/sessions.ts")), false);
    assert.equal(existsSync(path.join(RAIZ, "src/hooks/useUsageSession.ts")), false);
    const hook = ler("src/hooks/useSessaoDeAula.ts");
    assert.match(hook, /if \(!contando\) return;/, "só conta com a conversa ativa");
    assert.match(hook, /sendBeacon/, "fecha ao sair da página");
    assert.match(hook, /ENCERRAR_APOS_PAUSA_MS/, "fecha na pausa longa");
  });

  test("ações de horas usam o aluno do login, nunca um id do navegador", () => {
    const acoes = ler("src/app/aluno/sessions/actions.ts");
    assert.match(acoes, /requirePapel\("aluno"\)/);
    assert.equal(/alunoId\s*[:,)]/.test(acoes.replace(/sessao\.userId/g, "")), false);
    const rota = ler("src/app/api/aula/sessao/route.ts");
    assert.match(rota, /fecharSessaoDeAula\(sessao\.userId/);
  });

  test("confirmação de horas extras só pelo webhook (sem ação pública)", () => {
    const acoes = ler("src/app/aluno/topups/actions.ts");
    assert.equal(/export async function confirm/i.test(acoes), false);
    assert.equal(/process_topup_payment|confirmTopupPayment/.test(acoes), false);
    assert.equal(existsSync(path.join(RAIZ, "src/components/aluno/TopupSelector.tsx")), false);
    assert.equal(/melhor valor|maior economia/i.test(ler("src/app/aluno/horas/page.tsx")), false);
    assert.match(ler("src/lib/billing/topups.ts"), /createSupabaseAdminClient/);
  });

  test("webhook renova o ciclo de horas no pagamento confirmado", () => {
    const w = ler("src/app/api/webhooks/asaas/route.ts");
    assert.match(w, /rpc\("horas_renovar_ciclo"/);
    assert.equal((w.match(/await renovarCicloDeHoras\(/g) ?? []).length, 2, "1ª mensalidade e renovação");
  });

  test("sem horas leva para Minhas horas", () => {
    assert.match(ler("src/lib/billing/acesso.ts"), /semHoras \? "\/aluno\/horas"/);
  });

  test("admin: reposição exige suporte/geral, motivo e auditoria", () => {
    const a = ler("src/app/admin/alunos/[id]/actions.ts");
    assert.match(a, /acao === "conceder_horas" \? sessao\.funcoes\.some\(\(f\) => f === "geral" \|\| f === "suporte"\)/);
    assert.match(ler("src/lib/admin/alunos.ts"), /acao: "aluno\.conceder_horas"/);
  });
});
