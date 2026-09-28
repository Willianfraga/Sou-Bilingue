import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTEUDO_PADRAO, normalizarConteudo, type ConteudoVendas } from "@/lib/vendas/conteudo";
import type { Campanha, EventoDoFunil } from "@/lib/vendas/rastreio";

// Página de vendas — supabase/migrations/0016_pagina_de_vendas_e_funil.sql.

// Qualquer visitante lê (policy pública). Sem linha ou com erro, usa o padrão:
// a página de vendas nunca fica fora do ar por causa do conteúdo.
export async function getConteudoVendas(): Promise<ConteudoVendas> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("pagina_vendas").select("conteudo").eq("id", 1).maybeSingle();
  if (error) {
    console.error("Falha ao ler conteúdo da página de vendas:", error.message);
    return CONTEUDO_PADRAO;
  }
  return normalizarConteudo(data?.conteudo ?? {});
}

// Cliente de sessão: o RLS (app.is_admin) confirma de novo que é admin.
export async function salvarConteudoVendas(entrada: unknown, adminId: string): Promise<boolean> {
  const conteudo = normalizarConteudo(entrada);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("pagina_vendas").upsert(
    { id: 1, conteudo, atualizado_em: new Date().toISOString(), atualizado_por: adminId },
    { onConflict: "id" },
  );
  if (error) {
    console.error("Falha ao salvar conteúdo da página de vendas:", error.message);
    return false;
  }
  return true;
}

// Contagem de eventos dos últimos N dias (RLS: só admin lê eventos_funil).
export async function getResumoFunil(dias = 30): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("eventos_funil")
    .select("nome")
    .gte("criado_em", desde)
    .limit(20_000);
  if (error) {
    console.error("Falha ao ler resumo do funil:", error.message);
    return {};
  }
  const contagem: Record<string, number> = {};
  for (const { nome } of data ?? []) contagem[nome] = (contagem[nome] ?? 0) + 1;
  return contagem;
}

// Grava um evento do funil (service role: a tabela não aceita escrita do
// navegador). Falha de métrica nunca derruba o fluxo do usuário.
export async function registrarEventoFunil(evento: {
  nome: EventoDoFunil;
  sessao?: string;
  pagina?: string;
  plano?: string;
  campanha?: Campanha;
  alunoId?: string;
}) {
  const c = evento.campanha ?? {};
  const { error } = await createSupabaseAdminClient().from("eventos_funil").insert({
    nome: evento.nome,
    sessao: evento.sessao?.slice(0, 64) ?? null,
    pagina: evento.pagina?.slice(0, 120) ?? null,
    plano: evento.plano?.slice(0, 40) ?? null,
    utm_source: c.utm_source ?? null,
    utm_medium: c.utm_medium ?? null,
    utm_campaign: c.utm_campaign ?? null,
    utm_term: c.utm_term ?? null,
    utm_content: c.utm_content ?? null,
    src: c.src ?? null,
    sck: c.sck ?? null,
    cupom: c.coupon ?? null,
    aluno_id: evento.alunoId ?? null,
  });
  if (error) console.error("Falha ao registrar evento do funil:", error.message);
}
