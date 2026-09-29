"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/admin/auditoria";
import { requireArea, type SessaoAdmin } from "@/lib/admin/sessao";
import { cancelarLancamento, criarLancamento, salvarFornecedor, salvarOrcamento } from "@/lib/financeiro/dados";

// Escrita em custos, fornecedores e orçamento: administrador geral ou
// financeiro (analista só lê). Tudo auditado em src/lib/financeiro/dados.ts.
async function exigirEscrita(sessao: SessaoAdmin, acao: string, destino: string): Promise<SessaoAdmin> {
  if (!sessao.funcoes.some((f) => f === "geral" || f === "financeiro")) {
    await registrarAuditoria({ adminId: sessao.userId, acao, entidade: "configuracao", resultado: "negado" });
    redirect(`${destino}?erro=${encodeURIComponent("Sua função permite ver, mas não alterar custos.")}`);
  }
  return sessao;
}

const voltar = (destino: string, r: { ok: boolean; erro?: string }, ok = "1") =>
  redirect(r.ok ? `${destino}${destino.includes("?") ? "&" : "?"}ok=${ok}` : `${destino}${destino.includes("?") ? "&" : "?"}erro=${encodeURIComponent(r.erro ?? "Erro")}`);

export async function lancarCusto(formData: FormData) {
  const sessao = await exigirEscrita(await requireArea("ferramentas"), "custo.lancar", "/admin/custos");
  const r = await criarLancamento(sessao.userId, {
    fornecedorId: formData.get("fornecedorId"),
    categoria: formData.get("categoria"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    competencia: formData.get("competencia"),
    valor: formData.get("valor"),
    moeda: formData.get("moeda"),
    taxa: formData.get("taxa"),
    natureza: formData.get("natureza"),
    comprovante: formData.get("comprovante"),
  });
  revalidatePath("/admin/custos");
  revalidatePath("/admin/financeiro");
  voltar("/admin/custos", r, "lancado");
}

export async function cancelarCusto(formData: FormData) {
  const sessao = await exigirEscrita(await requireArea("ferramentas"), "custo.cancelar", "/admin/custos");
  const id = String(formData.get("id") ?? "");
  const r = /^[0-9a-f-]{36}$/i.test(id) ? await cancelarLancamento(sessao.userId, id, String(formData.get("motivo") ?? "")) : { ok: false as const, erro: "Lançamento inválido." };
  revalidatePath("/admin/custos");
  revalidatePath("/admin/financeiro");
  voltar("/admin/custos", r, "cancelado");
}

export async function gravarFornecedor(formData: FormData) {
  const idBruto = String(formData.get("id") ?? "");
  const id = /^[0-9a-f-]{36}$/i.test(idBruto) ? idBruto : null;
  const destino = id ? `/admin/custos/fornecedores/${id}` : "/admin/custos/fornecedores/novo";
  const sessao = await exigirEscrita(await requireArea("ferramentas"), "fornecedor.salvar", destino);
  const campos = Object.fromEntries(
    [
      "nome", "categoria", "empresa", "plano_contratado", "tipo_cobranca", "moeda", "valor_fixo_mensal", "custo_variavel", "franquia",
      "unidade_consumo", "dia_vencimento", "inicio_cobranca", "centro_custo", "responsavel", "status", "link_painel", "provedor_ia", "observacoes",
    ].map((k) => [k, formData.get(k)]),
  );
  const r = await salvarFornecedor(sessao.userId, id, campos, String(formData.get("motivo") ?? ""));
  revalidatePath("/admin/custos");
  revalidatePath("/admin/financeiro");
  if (r.ok) redirect(`/admin/custos?ok=fornecedor`);
  voltar(destino, r);
}

export async function gravarOrcamento(formData: FormData) {
  const competencia = String(formData.get("competencia") ?? "");
  const destino = `/admin/financeiro?mes=${encodeURIComponent(competencia.slice(0, 7))}`;
  const sessao = await exigirEscrita(await requireArea("financeiro"), "orcamento.salvar", destino);
  const valores: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (k.startsWith("orc_")) valores[k.slice(4)] = v;
  const nova = formData.get("categoria_nova");
  if (typeof nova === "string" && nova) valores[nova] = formData.get("valor_novo");
  const r = await salvarOrcamento(sessao.userId, competencia, valores);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/custos");
  voltar(destino, r, "orcamento");
}
