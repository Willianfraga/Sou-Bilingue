// Regras do verificador de saúde (npm run saude). Funções puras: recebem
// dados já coletados e devolvem itens { nivel, area, texto }. Testadas em
// test/saude.test.mjs. Nenhuma regra imprime segredo ou dado pessoal.
//
// nivel: "ok" | "aviso" | "problema"   (problema = exige ação)

const HORA = 60 * 60_000;
const DIA = 24 * HORA;

export const item = (nivel, area, texto) => ({ nivel, area, texto });

export function avaliarSite(respostas) {
  // respostas: [{ nome, status, esperado }]
  return respostas.map((r) =>
    r.status === r.esperado
      ? item("ok", "site", `${r.nome}: respondeu ${r.status}`)
      : item("problema", "site", `${r.nome}: esperado ${r.esperado}, veio ${r.status ?? "sem resposta"}`),
  );
}

export function avaliarWebhooks(eventos, agora = new Date()) {
  // eventos: [{ event_type, status, atualizado_em, tentativas }] dos últimos 7 dias
  const itens = [];
  const erros = eventos.filter((e) => e.status === "erro");
  const travados = eventos.filter((e) => e.status === "processando" && agora - new Date(e.atualizado_em) > 30 * 60_000);
  if (travados.length) itens.push(item("problema", "pagamentos", `${travados.length} aviso(s) do Asaas travado(s) em processamento há mais de 30 min`));
  if (erros.length) {
    const tipos = [...new Set(erros.map((e) => e.event_type))].join(", ");
    itens.push(item("aviso", "pagamentos", `${erros.length} aviso(s) do Asaas com erro nos últimos 7 dias (${tipos}) — reenvio no painel do Asaas reprocessa`));
  }
  if (!itens.length) itens.push(item("ok", "pagamentos", `avisos do Asaas em ordem (${eventos.length} nos últimos 7 dias)`));
  return itens;
}

export function avaliarIa(chamadas24h, ultimaChamada, agora = new Date()) {
  // chamadas24h: [{ provider, status, erro }]
  const itens = [];
  const semCredito = chamadas24h.some((c) => c.status === "erro" && /credit balance/i.test(c.erro ?? ""));
  if (semCredito) itens.push(item("problema", "ia", "Anthropic sem créditos: a tutora e o assistente de vendas não estão respondendo — recarregar em console.anthropic.com"));
  const porProvedor = new Map();
  for (const c of chamadas24h) {
    const p = porProvedor.get(c.provider) ?? { total: 0, erros: 0 };
    p.total += 1;
    if (c.status === "erro") p.erros += 1;
    porProvedor.set(c.provider, p);
  }
  for (const [provedor, p] of porProvedor) {
    const taxa = p.erros / p.total;
    if (p.total >= 5 && taxa >= 0.2) itens.push(item("problema", "ia", `${provedor}: ${p.erros} de ${p.total} chamadas com erro nas últimas 24 h`));
    else if (p.erros > 0) itens.push(item("aviso", "ia", `${provedor}: ${p.erros} erro(s) em ${p.total} chamadas nas últimas 24 h`));
    else itens.push(item("ok", "ia", `${provedor}: ${p.total} chamadas sem erro nas últimas 24 h`));
  }
  if (!chamadas24h.length) {
    const dias = ultimaChamada ? Math.floor((agora - new Date(ultimaChamada)) / DIA) : null;
    itens.push(item(dias !== null && dias >= 7 ? "aviso" : "ok", "ia", dias === null ? "nenhuma chamada de IA registrada ainda" : `sem chamadas de IA nas últimas 24 h (última há ${dias} dia(s))`));
  }
  return itens;
}

export function avaliarReembolsos(pedidos, agora = new Date()) {
  // pedidos: [{ protocolo, status, atualizado_em }] ainda não finalizados
  const itens = [];
  for (const p of pedidos) {
    const idade = agora - new Date(p.atualizado_em);
    if (p.status === "FAILED") itens.push(item("problema", "reembolsos", `${p.protocolo}: estorno falhou — reprocessar em Admin → Reembolsos`));
    else if (p.status === "UNDER_REVIEW" && idade > 3 * DIA) itens.push(item("aviso", "reembolsos", `${p.protocolo}: em análise há mais de 3 dias`));
    else if (p.status === "PROCESSING" && idade > 10 * DIA) itens.push(item("aviso", "reembolsos", `${p.protocolo}: estorno em processamento há mais de 10 dias — conferir no Asaas`));
  }
  if (!itens.length) itens.push(item("ok", "reembolsos", "nenhum reembolso pendente de ação"));
  return itens;
}

export function avaliarRetencao(mensagensVencidas) {
  return mensagensVencidas > 0
    ? item("problema", "privacidade", `${mensagensVencidas} mensagem(ns) com texto guardado há mais de 91 dias — a limpeza automática (pg_cron) não rodou`)
    : item("ok", "privacidade", "retenção de 90 dias das conversas em dia");
}

export function avaliarAlertasDeCusto(alertas) {
  if (!alertas.length) return [item("ok", "custos", "nenhum alerta de custo")];
  return alertas.map((a) => item(a.nivel === "critico" ? "problema" : "aviso", "custos", a.detalhe ? `${a.titulo} — ${a.detalhe}` : a.titulo));
}

export function avaliarContasDeTeste(quantidade) {
  return quantidade > 0
    ? item("aviso", "banco", `${quantidade} conta(s) de teste esquecida(s) (e-mail @soubilingue.test) — apagar`)
    : item("ok", "banco", "nenhuma conta de teste esquecida");
}

export function avaliarGit({ alteracoesPendentes, aFrenteDoGithub }) {
  const itens = [];
  if (alteracoesPendentes > 0) itens.push(item("aviso", "codigo", `${alteracoesPendentes} arquivo(s) alterado(s) sem salvar no Git`));
  if (aFrenteDoGithub > 0) itens.push(item("aviso", "codigo", `${aFrenteDoGithub} commit(s) ainda não enviados ao GitHub`));
  if (!itens.length) itens.push(item("ok", "codigo", "código salvo e igual ao GitHub"));
  return itens;
}

export function resumir(itens) {
  const problemas = itens.filter((i) => i.nivel === "problema").length;
  const avisos = itens.filter((i) => i.nivel === "aviso").length;
  const texto = problemas || avisos ? `${problemas} problema(s) e ${avisos} aviso(s)` : "Tudo certo";
  return { problemas, avisos, texto, codigoDeSaida: problemas ? 1 : 0 };
}

// Teste direto da conta Anthropic (chamada mínima). resultado:
// { semChave } | { ok: true } | { status, mensagem }
export function avaliarAnthropic(resultado) {
  if (resultado.semChave) return item("aviso", "ia", "sem ANTHROPIC_API_KEY no .env.local — conta Anthropic não testada");
  if (resultado.ok) return item("ok", "ia", "conta Anthropic respondendo (tem créditos)");
  const msg = String(resultado.mensagem ?? "");
  if (/credit balance/i.test(msg)) return item("problema", "ia", "Anthropic sem créditos: tutora e assistente de vendas não respondem — recarregar em console.anthropic.com/settings/billing");
  if (/not scoped to a workspace/i.test(msg)) return item("problema", "ia", "chave da Anthropic criada fora de um workspace — no Console, abra Workspaces → (seu workspace) → API Keys → Create Key e use essa");
  if (resultado.status === 401) return item("problema", "ia", "chave da Anthropic inválida ou revogada (a do .env.local; confira também a do Coolify)");
  if (resultado.status === 429 || resultado.status === 529) return item("aviso", "ia", `Anthropic ocupada agora (HTTP ${resultado.status}) — tente de novo em instantes`);
  return item("problema", "ia", `Anthropic respondeu com erro (HTTP ${resultado.status ?? "?"})`);
}
