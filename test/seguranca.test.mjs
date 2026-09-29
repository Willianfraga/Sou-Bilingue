// Fase 0 (auditoria de 27 set 2026): limite de requisições, barreira de
// plano nas rotas de IA, webhook sem dados pessoais e sem segredos no repo.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { _zerarLimites, ipDoCliente, limitar } from "../src/lib/seguranca/limite.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

describe("limite de requisições", () => {
  beforeEach(() => _zerarLimites());

  test("permite até o máximo e bloqueia o excedente com tempo de espera", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) assert.equal(limitar("a", 3, 60_000, t0 + i).permitido, true);
    const bloqueado = limitar("a", 3, 60_000, t0 + 10);
    assert.equal(bloqueado.permitido, false);
    assert.equal(bloqueado.tenteEmSegundos, 60);
  });

  test("a janela renova depois do intervalo", () => {
    const t0 = 2_000_000;
    limitar("b", 1, 1_000, t0);
    assert.equal(limitar("b", 1, 1_000, t0 + 500).permitido, false);
    assert.equal(limitar("b", 1, 1_000, t0 + 1_000).permitido, true);
  });

  test("chaves diferentes não se misturam (aluno A não bloqueia aluno B)", () => {
    const t0 = 3_000_000;
    limitar("aulaChat:A", 1, 60_000, t0);
    assert.equal(limitar("aulaChat:A", 1, 60_000, t0).permitido, false);
    assert.equal(limitar("aulaChat:B", 1, 60_000, t0).permitido, true);
  });

  test("IP do cliente: usa o último da cadeia (o que o proxy acrescentou)", () => {
    assert.equal(ipDoCliente(new Headers({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" })), "9.9.9.9");
    assert.equal(ipDoCliente(new Headers({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
    assert.equal(ipDoCliente(new Headers()), "desconhecido");
  });
});

describe("barreira de plano nas rotas de IA", () => {
  const rotas = {
    "src/app/api/aula/chat/route.ts": ["aulaChat", "client.messages.create"],
    "src/app/api/aula/voz/route.ts": ["aulaVoz", "sintetizarVoz({"],
    "src/app/api/aula/transcrever/route.ts": ["aulaTranscricao", "fetch("],
  };
  for (const [arquivo, [rota, chamadaCara]] of Object.entries(rotas)) {
    test(`${arquivo}: confere plano e limite antes de gerar custo`, () => {
      const codigo = ler(arquivo);
      const barreira = codigo.indexOf(`bloqueioDeAula(sessao.userId, "${rota}")`);
      assert.ok(barreira > 0, "chama bloqueioDeAula");
      assert.ok(codigo.indexOf(chamadaCara) > barreira, "barreira vem antes da chamada paga");
    });
  }

  test("sem plano ou sem horas a resposta é 402 com destino", () => {
    const acesso = ler("src/lib/billing/acesso.ts");
    assert.match(acesso, /canUseAI\(alunoId\)/);
    assert.match(acesso, /status: 402/);
  });

  test("rotas públicas sensíveis têm limite por IP", () => {
    for (const arquivo of ["src/app/api/cadastro/route.ts", "src/app/api/cadastro/onboarding/route.ts", "src/app/api/auth/reset-password/route.ts"]) {
      assert.match(ler(arquivo), /limitar\(\s*`(cadastro|recuperarSenha):\$\{ipDoCliente\(request\.headers\)\}`/, arquivo);
    }
  });
});

describe("webhook do Asaas", () => {
  const wh = ler("src/app/api/webhooks/asaas/route.ts");

  test("guarda um resumo sem dados do comprador", () => {
    assert.match(wh, /payload: resumoDoEvento\(evento\)/);
    const resumo = wh.slice(wh.indexOf("function resumoDoEvento"), wh.indexOf("export async function POST"));
    for (const campoPessoal of ["customer", "name", "email", "cpf", "phone"]) {
      assert.equal(new RegExp(`\\b${campoPessoal}\\b`, "i").test(resumo), false, campoPessoal);
    }
  });

  test("evento que falhou é reclamado de novo; processado não repete", () => {
    assert.match(wh, /\.or\(`status\.eq\.erro,and\(status\.eq\.processando,atualizado_em\.lt\.\$\{travadoAntesDe\}\)`\)/);
    assert.match(wh, /if \(!reclamado\?\.length\) return Response\.json\(\{ success: true, duplicate: true \}\)/);
  });

  test("middleware deixa o webhook chegar (a rota exige o token)", () => {
    assert.match(ler("src/middleware.ts"), /"\/api\/webhooks",/);
    assert.match(wh, /if \(!validateWebhookSignature\(token\)\)/);
  });

  test("log de falha não despeja o objeto de erro inteiro", () => {
    assert.match(wh, /console\.error\("Falha ao processar webhook Asaas:", evento\.event, evento\.id, mensagem\)/);
  });

  test("migration 0015 cria a tabela de eventos com RLS e controle de tentativas", () => {
    const sql = ler("supabase/migrations/0015_fase0_webhooks_e_endurecimento.sql");
    assert.match(sql, /create table if not exists public\.webhook_events/);
    assert.match(sql, /alter table public\.webhook_events enable row level security/);
    assert.match(sql, /tentativas smallint/);
    assert.equal(/drop table|delete from|truncate/i.test(sql), false, "não apaga dados");
  });
});

describe("segredos e dependências", () => {
  test("nenhuma senha de conta conhecida no repositório", () => {
    // git grep: código 1 = nada encontrado (o esperado).
    // Montada em partes para este arquivo não conter a senha antiga (trocada).
    for (const senhaAntiga of [["Teste", "@", "123"].join(""), ["Teste", "@", "2026", "!"].join("")]) {
      const r = spawnSync("git", ["grep", "-l", "-F", senhaAntiga], { cwd: RAIZ });
      assert.equal(r.status, 1, `encontrado em: ${r.stdout}`);
    }
  });

  test("Next.js com a correção da falha crítica de imagem (>= 15.5.26)", () => {
    const versao = JSON.parse(ler("node_modules/next/package.json")).version.split(".").map(Number);
    assert.ok(versao[0] > 15 || (versao[0] === 15 && (versao[1] > 5 || versao[2] >= 26)), versao.join("."));
  });
});
