import { ipDoCliente } from "@/lib/seguranca/limite";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { limparParaAuditoria } from "./auditoria-limpeza";

export { limparParaAuditoria };

// Auditoria das ações do painel (tabela admin_auditoria, só acréscimo).
// Nunca grava senha, token, chave, CPF ou cartão: limparParaAuditoria remove
// esses campos antes de gravar. Uma falha aqui não derruba a ação.

export type RegistroDeAuditoria = {
  adminId: string | null;
  acao: string; // ex.: "aluno.suspender", "conversa.visualizar", "acesso.negado"
  entidade: string; // ex.: "aluno", "conversa", "tutor", "area"
  entidadeId?: string | null;
  antes?: unknown;
  depois?: unknown;
  motivo?: string | null;
  resultado: "ok" | "erro" | "negado";
};

export async function registrarAuditoria(r: RegistroDeAuditoria): Promise<void> {
  try {
    let ip: string | null = null;
    try {
      const { headers } = await import("next/headers");
      ip = ipDoCliente(await headers()).slice(0, 64);
    } catch {
      // fora de uma requisição (testes/jobs)
    }
    const { error } = await createSupabaseAdminClient().from("admin_auditoria").insert({
      admin_id: r.adminId,
      acao: r.acao.slice(0, 60),
      entidade: r.entidade.slice(0, 40),
      entidade_id: r.entidadeId ? String(r.entidadeId).slice(0, 80) : null,
      antes: r.antes === undefined ? null : limparParaAuditoria(r.antes),
      depois: r.depois === undefined ? null : limparParaAuditoria(r.depois),
      motivo: r.motivo ? r.motivo.slice(0, 1000) : null,
      resultado: r.resultado,
      ip,
    });
    if (error) console.error("Falha ao gravar auditoria:", error.message);
  } catch (e) {
    console.error("Falha ao gravar auditoria:", e instanceof Error ? e.message : e);
  }
}

export type LinhaDeAuditoria = {
  id: number;
  admin_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  antes: unknown;
  depois: unknown;
  motivo: string | null;
  resultado: string;
  ip: string | null;
  criado_em: string;
  nomeAdmin: string | null;
};

export async function listarAuditoria(f: { pagina: number; porPagina: number; entidade?: string; resultado?: string; de?: string; ate?: string }) {
  const db = createSupabaseAdminClient();
  let q = db.from("admin_auditoria").select("*", { count: "exact" }).order("criado_em", { ascending: false });
  if (f.entidade) q = q.eq("entidade", f.entidade);
  if (f.resultado) q = q.eq("resultado", f.resultado);
  if (f.de) q = q.gte("criado_em", f.de);
  if (f.ate) q = q.lt("criado_em", f.ate);
  const inicio = (f.pagina - 1) * f.porPagina;
  const { data, count, error } = await q.range(inicio, inicio + f.porPagina - 1);
  if (error) throw new Error(error.message);
  const ids = [...new Set((data ?? []).map((l) => l.admin_id).filter(Boolean))] as string[];
  const { data: perfis } = ids.length ? await db.from("profiles").select("id, nome").in("id", ids) : { data: [] };
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome as string]));
  return {
    linhas: (data ?? []).map((l) => ({ ...l, nomeAdmin: l.admin_id ? nomes.get(l.admin_id) ?? null : null })) as LinhaDeAuditoria[],
    total: count ?? 0,
  };
}
