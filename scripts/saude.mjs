#!/usr/bin/env node
// Verificador de saúde do Sou Bilíngue — usado pelo agente de manutenção
// (.claude/agents/manutencao.md) e por você: `npm run saude`.
//
//   npm run saude              site, pagamentos, IA, reembolsos, privacidade,
//                              custos, banco, Git e testes unitários
//   npm run saude -- --rapido  sem rodar os testes
//   npm run saude -- --completo  + verificação de tipos e lint
//   npm run saude -- --json    saída para máquinas (agentes)
//   npm run saude -- --sem-ia  não testa a conta da Anthropic
//
// Só LÊ dados (nada é alterado). Usa as chaves do .env.local e NUNCA as
// imprime. Não mostra dados pessoais de alunos. Sai com código 1 se houver
// "problema" (útil para rotinas agendadas).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  avaliarAlertasDeCusto,
  avaliarAnthropic,
  avaliarContasDeTeste,
  avaliarGit,
  avaliarIa,
  avaliarReembolsos,
  avaliarRetencao,
  avaliarSite,
  avaliarWebhooks,
  item,
  resumir,
} from "./saude/regras.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const BASE = process.env.SAUDE_BASE_URL || "https://app.soubilingue.com.br";
const BRANCH = "codex/sou-bilingue-deploy";

function env() {
  const e = { ...process.env };
  const arquivo = path.join(RAIZ, ".env.local");
  if (existsSync(arquivo)) {
    for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && e[m[1]] === undefined) e[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return e;
}

async function status(url, opcoes) {
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000), ...opcoes });
    return r.status;
  } catch {
    return null;
  }
}

async function verificarSite() {
  return avaliarSite([
    { nome: "Página inicial", status: await status(`${BASE}/`), esperado: 200 },
    { nome: "Login", status: await status(`${BASE}/login`), esperado: 200 },
    { nome: "Webhook do Asaas protegido", status: await status(`${BASE}/api/webhooks/asaas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }), esperado: 401 },
  ]);
}

async function verificarBanco(e) {
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
    return [item("aviso", "banco", "sem credenciais do Supabase no .env.local — checagens do banco puladas")];
  }
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const agora = new Date();
  const desde = (ms) => new Date(agora.getTime() - ms).toISOString();
  const itens = [];
  const falhou = (area, erro) => itens.push(item("problema", area, `não foi possível consultar (${String(erro?.message ?? erro).slice(0, 120)})`));

  const webhooks = await db.from("webhook_events").select("event_type, status, atualizado_em, tentativas").gte("recebido_em", desde(7 * 86_400_000));
  webhooks.error ? falhou("pagamentos", webhooks.error) : itens.push(...avaliarWebhooks(webhooks.data ?? [], agora));

  const ia = await db.from("ai_usage_events").select("provider, status, erro").gte("created_at", desde(86_400_000)).limit(5000);
  const ultima = await db.from("ai_usage_events").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  ia.error ? falhou("ia", ia.error) : itens.push(...avaliarIa(ia.data ?? [], ultima.data?.created_at ?? null, agora));

  const reemb = await db.from("reembolsos").select("protocolo, status, atualizado_em").in("status", ["FAILED", "UNDER_REVIEW", "PROCESSING"]);
  reemb.error ? falhou("reembolsos", reemb.error) : itens.push(...avaliarReembolsos(reemb.data ?? [], agora));

  const vencidas = await db.from("mensagens").select("id", { count: "exact", head: true }).not("texto", "is", null).lt("criado_em", desde(91 * 86_400_000));
  vencidas.error ? falhou("privacidade", vencidas.error) : itens.push(avaliarRetencao(vencidas.count ?? 0));

  let taxa = 0;
  const cambio = await db.from("billing_config").select("valor").eq("chave", "cambio_usd_brl").maybeSingle();
  try {
    taxa = JSON.parse(cambio.data?.valor ?? "{}").taxa ?? 0;
  } catch {
    // sem câmbio salvo: alertas em reais ficam de fora
  }
  const alertas = await db.rpc("admin_alertas_custos", { p_taxa: taxa });
  alertas.error ? falhou("custos", alertas.error) : itens.push(...avaliarAlertasDeCusto(alertas.data ?? []));

  let contasTeste = 0;
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) {
      falhou("banco", error);
      break;
    }
    contasTeste += data.users.filter((u) => (u.email ?? "").endsWith("@soubilingue.test")).length;
    if (data.users.length < 200) break;
  }
  itens.push(avaliarContasDeTeste(contasTeste));
  return itens;
}

// Chamada mínima (1 token de resposta, Haiku) para saber se a conta tem
// crédito — mesmo sem nenhum aluno usando. Usa a chave do .env.local (mesma
// conta da produção, se for a mesma organização). Custo: frações de centavo.
async function verificarAnthropic(e) {
  if (!e.ANTHROPIC_API_KEY) return avaliarAnthropic({ semChave: true });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": e.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...(/^wrkspc_[A-Za-z0-9]+$/.test(e.ANTHROPIC_WORKSPACE_ID ?? "") ? { "anthropic-workspace-id": e.ANTHROPIC_WORKSPACE_ID } : {}),
      },
      body: JSON.stringify({ model: e.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return avaliarAnthropic({ ok: true });
    const corpo = await r.json().catch(() => ({}));
    return avaliarAnthropic({ status: r.status, mensagem: corpo?.error?.message ?? "" });
  } catch (erro) {
    return avaliarAnthropic({ status: null, mensagem: String(erro?.message ?? erro) });
  }
}

function verificarGit() {
  const git = (...a) => spawnSync("git", a, { cwd: RAIZ, encoding: "utf8" });
  const pendentes = git("status", "--porcelain").stdout.split("\n").filter(Boolean).length;
  git("fetch", "-q", "origin", BRANCH);
  const frente = git("rev-list", "--count", `origin/${BRANCH}..HEAD`);
  return avaliarGit({ alteracoesPendentes: pendentes, aFrenteDoGithub: frente.status === 0 ? Number(frente.stdout.trim()) : 0 });
}

function rodar(rotulo, comando, argumentos) {
  const r = spawnSync(comando, argumentos, { cwd: RAIZ, encoding: "utf8", shell: process.platform === "win32" });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const pass = saida.match(/ℹ pass (\d+)/)?.[1];
  const fail = saida.match(/ℹ fail (\d+)/)?.[1];
  if (r.status === 0) return item("ok", "testes", pass ? `${rotulo}: ${pass} passaram` : `${rotulo}: sem erros`);
  return item("problema", "testes", fail ? `${rotulo}: ${fail} falharam (rode ${[comando, ...argumentos].join(" ")} para ver)` : `${rotulo}: falhou (rode ${[comando, ...argumentos].join(" ")})`);
}

const ICONE = { ok: "✔", aviso: "⚠", problema: "✖" };

async function principal() {
  const e = env();
  const itens = [...(await verificarSite()), ...(await verificarBanco(e))];
  if (!args.has("--sem-ia")) itens.push(await verificarAnthropic(e));
  itens.push(...verificarGit());
  if (!args.has("--rapido")) itens.push(rodar("Testes unitários", "npm", ["run", "-s", "test:unit"]));
  if (args.has("--completo")) {
    itens.push(rodar("Tipos (tsc)", "npx", ["tsc", "--noEmit"]));
    itens.push(rodar("Lint", "npx", ["next", "lint"]));
  }
  const r = resumir(itens);

  if (args.has("--json")) {
    console.log(JSON.stringify({ quando: new Date().toISOString(), site: BASE, resumo: r, itens }, null, 2));
  } else {
    console.log(`\nSaúde do Sou Bilíngue — ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} — ${BASE}\n`);
    for (const area of [...new Set(itens.map((i) => i.area))]) {
      console.log(area.toUpperCase());
      for (const i of itens.filter((x) => x.area === area)) console.log(`  ${ICONE[i.nivel]} ${i.texto}`);
    }
    console.log(`\nResultado: ${r.texto}\n`);
  }
  process.exit(r.codigoDeSaida);
}

principal().catch((erro) => {
  console.error("Falha no verificador de saúde:", String(erro?.message ?? erro).slice(0, 200));
  process.exit(2);
});
