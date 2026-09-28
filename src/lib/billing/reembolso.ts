import { randomUUID } from "node:crypto";
import { cancelSubscription, refundPayment } from "@/lib/asaas/client";
import { cancelarAssinaturaDoAluno } from "@/lib/billing/cancelamento";
import {
  dentroDoPrazo,
  fimDoPrazo,
  gerarProtocolo,
  podeMudar,
  statusDoEventoAsaas,
  validarPedidoDeReembolso,
  type StatusReembolso,
} from "@/lib/billing/regras-reembolso";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Reembolsos — política em docs/refund-policy.md; tabelas na migration 0018.
// Tudo no servidor com service role, sempre filtrando pelo aluno da sessão;
// prazo, valor e pagamento vêm do banco, nunca do navegador. "Reembolsado"
// só é marcado pelo webhook do Asaas.

type Ator = "aluno" | "admin" | "webhook" | "sistema";
const db = () => createSupabaseAdminClient();

export type Reembolso = {
  id: string;
  protocolo: string;
  aluno_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  asaas_payment_id: string;
  valor: number;
  dentro_do_prazo: boolean;
  prazo_final: string;
  motivo: string | null;
  comentario: string | null;
  status: StatusReembolso;
  erro: string | null;
  solicitado_em: string;
  atualizado_em: string;
};

async function registrarEvento(
  reembolsoId: string,
  tipo: string,
  ator: Ator,
  extra: { de?: string | null; para?: string | null; atorId?: string | null; observacao?: string | null } = {},
) {
  const { error } = await db().from("reembolso_eventos").insert({
    reembolso_id: reembolsoId,
    tipo,
    status_anterior: extra.de ?? null,
    status_novo: extra.para ?? null,
    ator,
    ator_id: extra.atorId ?? null,
    observacao: extra.observacao?.slice(0, 1000) ?? null,
  });
  if (error) console.error("Falha ao registrar evento de reembolso:", error.message);
}

// Muda o status só se a transição for válida e o registro ainda estiver no
// status lido (trava otimista contra duas ações ao mesmo tempo).
async function mudarStatus(r: Reembolso, para: StatusReembolso, ator: Ator, extra: { atorId?: string | null; observacao?: string | null; erro?: string | null } = {}) {
  if (!podeMudar(r.status, para)) return false;
  const { data, error } = await db()
    .from("reembolsos")
    .update({ status: para, erro: extra.erro ?? null, atualizado_em: new Date().toISOString() })
    .eq("id", r.id)
    .eq("status", r.status)
    .select("id");
  if (error || !data?.length) return false;
  await registrarEvento(r.id, `status:${para}`, ator, { de: r.status, para, atorId: extra.atorId, observacao: extra.observacao ?? extra.erro });
  r.status = para;
  return true;
}

// ---------- situação do aluno ----------

export type SituacaoReembolso = {
  pagamento: { id: string; asaas_payment_id: string; valor: number; data_pagamento: string } | null;
  subscriptionId: string | null;
  prazoFinal: Date | null;
  dentro: boolean;
  pedidos: Reembolso[];
};

// 1º pagamento confirmado da assinatura mais recente: é ele que o direito de
// arrependimento cobre.
export async function getSituacaoReembolso(alunoId: string, agora = new Date()): Promise<SituacaoReembolso> {
  const { data: sub } = await db()
    .from("subscriptions")
    .select("id")
    .eq("aluno_id", alunoId)
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pedidos } = await db()
    .from("reembolsos")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("solicitado_em", { ascending: false });

  if (!sub) return { pagamento: null, subscriptionId: null, prazoFinal: null, dentro: false, pedidos: (pedidos ?? []) as Reembolso[] };

  const { data: pag } = await db()
    .from("payments")
    .select("id, asaas_payment_id, valor, data_pagamento")
    .eq("subscription_id", sub.id)
    .in("status", ["pago", "estornado"])
    .not("data_pagamento", "is", null)
    .order("data_pagamento", { ascending: true })
    .limit(1)
    .maybeSingle();

  const prazoFinal = pag?.data_pagamento ? fimDoPrazo(pag.data_pagamento) : null;
  return {
    pagamento: pag ? { ...pag, valor: Number(pag.valor) } : null,
    subscriptionId: sub.id,
    prazoFinal,
    dentro: pag?.data_pagamento ? dentroDoPrazo(pag.data_pagamento, agora) : false,
    pedidos: (pedidos ?? []) as Reembolso[],
  };
}

// ---------- pedido do aluno ----------

export type ResultadoPedido = { ok: true; reembolso: Reembolso; jaExistia: boolean } | { ok: false; erro: string };

export async function solicitarReembolso(alunoId: string, entrada: { motivo: unknown; comentario: unknown }, agora = new Date()): Promise<ResultadoPedido> {
  const s = await getSituacaoReembolso(alunoId, agora);
  if (!s.pagamento) return { ok: false, erro: "Não encontramos um pagamento confirmado para reembolsar." };

  // Um pedido por pagamento pelo app: negado ou com falha segue com a equipe
  // (reanálise / reprocessar no admin), não vira pedido novo.
  const existente = s.pedidos.find((p) => p.asaas_payment_id === s.pagamento!.asaas_payment_id);
  if (existente) return { ok: true, reembolso: existente, jaExistia: true };

  const v = validarPedidoDeReembolso({ dentroDoPrazo: s.dentro, motivo: entrada.motivo, comentario: entrada.comentario });
  if (!v.ok) return v;

  const { data: novo, error } = await db()
    .from("reembolsos")
    .insert({
      protocolo: gerarProtocolo(agora, randomUUID()),
      aluno_id: alunoId,
      subscription_id: s.subscriptionId,
      payment_id: s.pagamento.id,
      asaas_payment_id: s.pagamento.asaas_payment_id,
      valor: s.pagamento.valor,
      dentro_do_prazo: s.dentro,
      prazo_final: s.prazoFinal!.toISOString(),
      motivo: v.motivo,
      comentario: v.comentario,
      status: s.dentro ? "REQUESTED" : "UNDER_REVIEW",
    })
    .select("*")
    .single();

  if (error) {
    // Dois cliques ao mesmo tempo: o índice único segura; devolve o existente.
    if (error.code === "23505") {
      const { data: existente } = await db()
        .from("reembolsos")
        .select("*")
        .eq("asaas_payment_id", s.pagamento.asaas_payment_id)
        .not("status", "in", "(REJECTED,FAILED)")
        .maybeSingle();
      if (existente) return { ok: true, reembolso: existente as Reembolso, jaExistia: true };
    }
    console.error("Falha ao registrar pedido de reembolso:", error.message);
    return { ok: false, erro: "Não foi possível registrar o pedido agora. Tente de novo em instantes." };
  }

  const r = novo as Reembolso;
  await registrarEvento(r.id, "solicitado", "aluno", {
    para: r.status,
    atorId: alunoId,
    observacao: s.dentro ? "Dentro do prazo de 7 dias" : `Fora do prazo — motivo: ${v.motivo}`,
  });

  if (s.dentro) {
    // Reembolso por arrependimento também encerra a renovação. Se o Asaas
    // falhar aqui, o estorno segue: a confirmação dele (webhook) remove a
    // recorrência de novo. O acesso só termina com o estorno confirmado.
    const cancelamento = await cancelarAssinaturaDoAluno(alunoId, v.motivo);
    if (!cancelamento.ok) await registrarEvento(r.id, "falha_ao_cancelar_renovacao", "sistema", { observacao: cancelamento.erro });
    await enviarAoProvedor(r, "sistema", null);
  }
  return { ok: true, reembolso: r, jaExistia: false };
}

// ---------- envio ao Asaas ----------

export async function enviarAoProvedor(r: Reembolso, ator: Ator, atorId: string | null): Promise<boolean> {
  if (!["REQUESTED", "APPROVED", "FAILED"].includes(r.status)) return false;
  try {
    await refundPayment(r.asaas_payment_id, `Sou Bilíngue — reembolso ${r.protocolo}`);
    return mudarStatus(r, "PROCESSING", ator, { atorId, observacao: "Estorno enviado ao Asaas; aguardando confirmação." });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : "erro desconhecido").slice(0, 500);
    console.error("Falha ao pedir estorno ao Asaas:", r.protocolo, msg);
    if (r.status === "FAILED") {
      await registrarEvento(r.id, "falha_ao_reprocessar", ator, { de: "FAILED", para: "FAILED", atorId, observacao: msg });
      return false;
    }
    await mudarStatus(r, "FAILED", ator, { atorId, erro: msg });
    return false;
  }
}

// ---------- administrador ----------

async function carregar(id: string): Promise<Reembolso | null> {
  const { data } = await db().from("reembolsos").select("*").eq("id", id).maybeSingle();
  return (data as Reembolso) ?? null;
}

export async function decidirReembolso(id: string, decisao: "aprovar" | "negar", adminId: string, justificativa: string) {
  const texto = justificativa.trim();
  if (texto.length < 5) return { ok: false as const, erro: "Escreva uma justificativa (mínimo 5 caracteres)." };
  const r = await carregar(id);
  if (!r) return { ok: false as const, erro: "Pedido não encontrado." };

  if (decisao === "negar") {
    const ok = await mudarStatus(r, "REJECTED", "admin", { atorId: adminId, observacao: texto });
    return ok ? { ok: true as const } : { ok: false as const, erro: "Este pedido não pode mais ser negado." };
  }
  if (!(await mudarStatus(r, "APPROVED", "admin", { atorId: adminId, observacao: texto }))) {
    return { ok: false as const, erro: "Este pedido não pode mais ser aprovado." };
  }
  await enviarAoProvedor(r, "admin", adminId);
  return { ok: true as const };
}

export async function reprocessarReembolso(id: string, adminId: string, justificativa: string) {
  if (justificativa.trim().length < 5) return { ok: false as const, erro: "Escreva uma justificativa." };
  const r = await carregar(id);
  if (!r || r.status !== "FAILED") return { ok: false as const, erro: "Só pedidos com falha podem ser reprocessados." };
  await registrarEvento(r.id, "reprocessamento", "admin", { atorId: adminId, observacao: justificativa.trim() });
  const ok = await enviarAoProvedor(r, "admin", adminId);
  return ok ? { ok: true as const } : { ok: false as const, erro: "O Asaas recusou de novo — veja o erro no histórico." };
}

export async function anotarReembolso(id: string, adminId: string, observacao: string) {
  if (observacao.trim().length < 2) return { ok: false as const, erro: "Observação vazia." };
  await registrarEvento(id, "observacao", "admin", { atorId: adminId, observacao: observacao.trim() });
  return { ok: true as const };
}

// ---------- webhook ----------

// Evento de estorno do Asaas. Repetido ou fora de ordem não retrocede o
// status (podeMudar). Estorno feito direto no painel do Asaas também fica
// registrado (cria o pedido já no status do evento).
export async function aplicarEventoDeEstorno(asaasPaymentId: string, evento: string) {
  const para = statusDoEventoAsaas(evento);
  if (!para) return;

  const { data: pedidos } = await db()
    .from("reembolsos")
    .select("*")
    .eq("asaas_payment_id", asaasPaymentId)
    .order("solicitado_em", { ascending: false })
    .limit(1);
  let r = (pedidos?.[0] as Reembolso) ?? null;

  if (!r) {
    const { data: pag } = await db()
      .from("payments")
      .select("id, aluno_id, subscription_id, valor, data_pagamento")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();
    if (!pag) return; // pagamento que não é deste app
    const agora = new Date();
    const prazo = pag.data_pagamento ? fimDoPrazo(pag.data_pagamento) : agora;
    const { data: criado, error } = await db()
      .from("reembolsos")
      .insert({
        protocolo: gerarProtocolo(agora, randomUUID()),
        aluno_id: pag.aluno_id,
        subscription_id: pag.subscription_id,
        payment_id: pag.id,
        asaas_payment_id: asaasPaymentId,
        valor: pag.valor,
        dentro_do_prazo: agora <= prazo,
        prazo_final: prazo.toISOString(),
        motivo: null,
        comentario: "Estorno feito diretamente no painel do Asaas",
        status: "PROCESSING",
      })
      .select("*")
      .single();
    if (error || !criado) throw new Error(`Falha ao registrar estorno externo: ${error?.message}`);
    r = criado as Reembolso;
    await registrarEvento(r.id, "estorno_externo", "webhook", { para: "PROCESSING", observacao: evento });
  }

  const mudou = await mudarStatus(r, para, "webhook", { observacao: evento, erro: para === "FAILED" ? `Asaas: ${evento}` : null });
  if (!mudou) {
    await registrarEvento(r.id, "evento_ignorado", "webhook", { de: r.status, para, observacao: `${evento} (repetido ou fora de ordem)` });
    return;
  }

  if (para === "REFUNDED") await encerrarAposEstorno(r);
}

// Estorno confirmado: pagamento marcado como estornado (histórico mantido),
// assinatura encerrada e renovação garantidamente cancelada no Asaas.
async function encerrarAposEstorno(r: Reembolso) {
  const hoje = new Date().toISOString();
  if (r.payment_id) await db().from("payments").update({ status: "estornado", atualizada_em: hoje }).eq("id", r.payment_id);
  if (!r.subscription_id) return;
  const { data: sub } = await db().from("subscriptions").select("asaas_subscription_id, status").eq("id", r.subscription_id).maybeSingle();
  if (sub?.asaas_subscription_id) {
    try {
      await cancelSubscription(sub.asaas_subscription_id);
    } catch {
      // já removida — ok
    }
  }
  await db()
    .from("subscriptions")
    .update({ status: "cancelada", cancelada_em: hoje, acesso_ate: hoje.slice(0, 10), atualizada_em: hoje })
    .eq("id", r.subscription_id);
}

// ---------- leitura para o admin ----------

export type EventoDeReembolso = {
  id: number;
  tipo: string;
  status_anterior: string | null;
  status_novo: string | null;
  ator: Ator;
  ator_id: string | null;
  observacao: string | null;
  criado_em: string;
};

export async function listarReembolsosParaAdmin() {
  const { data: pedidos } = await db()
    .from("reembolsos")
    .select("*, reembolso_eventos(*)")
    .order("solicitado_em", { ascending: false })
    .limit(200);
  const lista = (pedidos ?? []) as (Reembolso & { reembolso_eventos: EventoDeReembolso[] })[];

  const ids = [...new Set(lista.flatMap((p) => [p.aluno_id, ...p.reembolso_eventos.map((e) => e.ator_id)]).filter(Boolean))] as string[];
  const { data: perfis } = ids.length ? await db().from("profiles").select("id, nome").in("id", ids) : { data: [] };
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome as string]));

  return lista.map((p) => ({
    ...p,
    nomeAluno: nomes.get(p.aluno_id) ?? "—",
    eventos: [...p.reembolso_eventos]
      .sort((a, b) => a.id - b.id)
      .map((e) => ({ ...e, nomeAtor: e.ator_id ? nomes.get(e.ator_id) ?? null : null })),
  }));
}
