import { redirect } from "next/navigation";
import { requirePapel, type Sessao } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "./auditoria";
import { normalizarFuncoes, podeAcessar, type FuncaoAdmin } from "./permissoes";

export type SessaoAdmin = Sessao & { funcoes: FuncaoAdmin[] };

// Admin logado + funções (tabela admin_funcoes). Sem linha = nenhuma função:
// entra no painel, mas não vê nenhuma área até um administrador geral atribuir.
export async function getSessaoAdmin(): Promise<SessaoAdmin> {
  const sessao = await requirePapel("admin");
  const { data } = await createSupabaseAdminClient().from("admin_funcoes").select("funcoes").eq("admin_id", sessao.userId).maybeSingle();
  return { ...sessao, funcoes: normalizarFuncoes(data?.funcoes) };
}

// Barreira de cada página e server action do painel. Negado vai para a
// visão geral com aviso e fica registrado na auditoria.
export async function requireArea(areaId: string): Promise<SessaoAdmin> {
  const sessao = await getSessaoAdmin();
  if (!podeAcessar(sessao.funcoes, areaId)) {
    await registrarAuditoria({ adminId: sessao.userId, acao: "acesso.negado", entidade: "area", entidadeId: areaId, resultado: "negado" });
    redirect(areaId === "visao-geral" ? "/admin/sem-acesso" : `/admin/sem-acesso?area=${encodeURIComponent(areaId)}`);
  }
  return sessao;
}
