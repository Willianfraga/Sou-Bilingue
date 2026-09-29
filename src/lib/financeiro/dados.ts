import { registrarAuditoria } from "@/lib/admin/auditoria";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { IDS_CATEGORIA } from "./categorias";
import { getCambioUsdBrl } from "./cambio";
import { montarDemonstrativo, type FornecedorResumo } from "./demonstrativo";
import { competenciaDoMes, converterCentavos, paraCentavos, validarFornecedor, validarLancamento, type EntradaLancamento } from "./regras";

// Custos, ferramentas, orçamento e financeiro (Fase C). Só servidor, depois
// de requireArea. Toda escrita vai para a auditoria com antes/depois.

const db = () => createSupabaseAdminClient();
type R = { ok: true; id?: string } | { ok: false; erro: string };

// ---------- fornecedores ----------

export type Fornecedor = FornecedorResumo & Record<string, unknown>;

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await db().from("fornecedores").select("*").order("status").order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as Fornecedor[];
}

export async function buscarFornecedor(id: string): Promise<Fornecedor | null> {
  const { data } = await db().from("fornecedores").select("*").eq("id", id).maybeSingle();
  return (data as Fornecedor) ?? null;
}

export async function salvarFornecedor(adminId: string, id: string | null, entrada: Record<string, unknown>, motivo: string): Promise<R> {
  const v = validarFornecedor(entrada);
  if (!v.ok) return v;
  const agora = new Date().toISOString();
  if (id) {
    if (motivo.trim().length < 5) return { ok: false, erro: "Escreva o motivo da alteração (mínimo 5 caracteres)." };
    const antes = await buscarFornecedor(id);
    if (!antes) return { ok: false, erro: "Fornecedor não encontrado." };
    const { error } = await db().from("fornecedores").update({ ...v.dados, atualizado_em: agora, atualizado_por: adminId }).eq("id", id);
    await registrarAuditoria({ adminId, acao: "fornecedor.editar", entidade: "fornecedor", entidadeId: id, antes, depois: v.dados, motivo, resultado: error ? "erro" : "ok" });
    return error ? { ok: false, erro: "Não foi possível salvar." } : { ok: true, id };
  }
  const { data, error } = await db().from("fornecedores").insert({ ...v.dados, atualizado_por: adminId }).select("id").single();
  await registrarAuditoria({ adminId, acao: "fornecedor.criar", entidade: "fornecedor", entidadeId: data?.id ?? null, depois: v.dados, resultado: error ? "erro" : "ok" });
  return error || !data ? { ok: false, erro: "Não foi possível salvar." } : { ok: true, id: data.id };
}

// ---------- lançamentos ----------

export type Lancamento = {
  id: string;
  fornecedor_id: string | null;
  categoria: string;
  tipo_custo: string;
  descricao: string;
  competencia: string;
  valor_original: number;
  moeda: string;
  taxa_cambio: number;
  data_cambio: string;
  fonte_cambio: string;
  valor_brl: number;
  natureza: string;
  origem: string;
  comprovante: string | null;
  criado_em: string;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  fornecedor?: string | null;
};

export async function listarLancamentos(f: { competencia?: string | null; categoria?: string; natureza?: string; incluirCancelados?: boolean; pagina: number; porPagina: number }) {
  let q = db().from("lancamentos_custo").select("*, fornecedores(nome)", { count: "exact" }).order("competencia", { ascending: false }).order("criado_em", { ascending: false });
  if (f.competencia) q = q.eq("competencia", f.competencia);
  if (f.categoria && IDS_CATEGORIA.includes(f.categoria)) q = q.eq("categoria", f.categoria);
  if (f.natureza === "estimado" || f.natureza === "confirmado") q = q.eq("natureza", f.natureza);
  if (!f.incluirCancelados) q = q.is("cancelado_em", null);
  const inicio = (f.pagina - 1) * f.porPagina;
  const { data, count, error } = await q.range(inicio, inicio + f.porPagina - 1);
  if (error) throw new Error(error.message);
  return {
    linhas: (data ?? []).map((l) => {
      const forn = Array.isArray(l.fornecedores) ? l.fornecedores[0] : l.fornecedores;
      return { ...l, fornecedor: forn?.nome ?? null, valor_original: Number(l.valor_original), valor_brl: Number(l.valor_brl), taxa_cambio: Number(l.taxa_cambio) } as Lancamento;
    }),
    total: count ?? 0,
  };
}

export async function criarLancamento(adminId: string, entrada: EntradaLancamento): Promise<R> {
  const v = validarLancamento(entrada);
  if (!v.ok) return v;
  const d = v.dados;
  let taxaMicro: bigint;
  let dataCambio = new Date().toISOString().slice(0, 10);
  let fonte: string;
  if (d.moeda === "BRL") {
    taxaMicro = BigInt(1_000_000);
    fonte = "Sem conversão (real)";
  } else if (d.taxaInformada) {
    taxaMicro = d.taxaInformada;
    fonte = "Informada pelo administrador";
  } else {
    const cambio = await getCambioUsdBrl();
    if (!cambio) return { ok: false, erro: "Câmbio indisponível agora. Informe a taxa usada na fatura." };
    taxaMicro = BigInt(Math.round(cambio.taxa * 1_000_000));
    dataCambio = cambio.data;
    fonte = cambio.reserva ? `${cambio.fonte} (última cotação salva)` : cambio.fonte;
  }
  const valorBrlC = converterCentavos(d.centavosOriginais, taxaMicro);
  const registro = {
    fornecedor_id: d.fornecedorId,
    categoria: d.categoria,
    tipo_custo: d.tipo,
    descricao: d.descricao,
    competencia: d.competencia,
    valor_original: (d.centavosOriginais / 100).toFixed(2),
    moeda: d.moeda,
    taxa_cambio: (Number(taxaMicro) / 1_000_000).toFixed(6),
    data_cambio: dataCambio,
    fonte_cambio: fonte,
    valor_brl: (valorBrlC / 100).toFixed(2),
    natureza: d.natureza,
    origem: d.natureza === "confirmado" ? "fatura" : "manual",
    comprovante: d.comprovante,
    criado_por: adminId,
  };
  const { data, error } = await db().from("lancamentos_custo").insert(registro).select("id").single();
  await registrarAuditoria({ adminId, acao: "custo.lancar", entidade: "lancamento", entidadeId: data?.id ?? null, depois: registro, resultado: error ? "erro" : "ok" });
  return error || !data ? { ok: false, erro: "Não foi possível lançar." } : { ok: true, id: data.id };
}

// Lançamento não é apagado: é cancelado com motivo (histórico mantido).
export async function cancelarLancamento(adminId: string, id: string, motivo: string): Promise<R> {
  if (motivo.trim().length < 5) return { ok: false, erro: "Escreva o motivo do cancelamento." };
  const { data: antes } = await db().from("lancamentos_custo").select("*").eq("id", id).maybeSingle();
  if (!antes) return { ok: false, erro: "Lançamento não encontrado." };
  if (antes.cancelado_em) return { ok: false, erro: "Lançamento já cancelado." };
  const { error } = await db()
    .from("lancamentos_custo")
    .update({ cancelado_em: new Date().toISOString(), cancelado_por: adminId, motivo_cancelamento: motivo.trim().slice(0, 500) })
    .eq("id", id)
    .is("cancelado_em", null);
  await registrarAuditoria({ adminId, acao: "custo.cancelar", entidade: "lancamento", entidadeId: id, antes, motivo, resultado: error ? "erro" : "ok" });
  return error ? { ok: false, erro: "Não foi possível cancelar." } : { ok: true };
}

// ---------- orçamento ----------

export async function salvarOrcamento(adminId: string, competenciaBruta: unknown, valores: Record<string, unknown>): Promise<R> {
  const competencia = competenciaDoMes(competenciaBruta);
  if (!competencia) return { ok: false, erro: "Mês inválido." };
  const linhas: Array<{ competencia: string; categoria: string; valor_brl: string; atualizado_por: string }> = [];
  const remover: string[] = [];
  for (const [categoria, bruto] of Object.entries(valores)) {
    if (categoria !== "total" && !IDS_CATEGORIA.includes(categoria)) continue;
    const texto = typeof bruto === "string" ? bruto.trim() : "";
    if (!texto) {
      remover.push(categoria);
      continue;
    }
    const centavos = paraCentavos(texto);
    if (centavos === null) return { ok: false, erro: `Valor inválido em ${categoria}.` };
    linhas.push({ competencia, categoria, valor_brl: (centavos / 100).toFixed(2), atualizado_por: adminId });
  }
  const { data: antes } = await db().from("orcamentos").select("categoria, valor_brl").eq("competencia", competencia);
  if (linhas.length) {
    const { error } = await db().from("orcamentos").upsert(linhas, { onConflict: "competencia,categoria" });
    if (error) return { ok: false, erro: "Não foi possível salvar o orçamento." };
  }
  if (remover.length) await db().from("orcamentos").delete().eq("competencia", competencia).in("categoria", remover);
  await registrarAuditoria({ adminId, acao: "orcamento.salvar", entidade: "orcamento", entidadeId: competencia, antes, depois: linhas, resultado: "ok" });
  return { ok: true };
}

// ---------- leituras agregadas ----------

export async function getDemonstrativo(de: string, ate: string) {
  const [meses, fornecedores, cambio] = await Promise.all([
    db().rpc("admin_financeiro_mensal", { p_de: de, p_ate: ate }),
    listarFornecedores(),
    getCambioUsdBrl(),
  ]);
  if (meses.error) throw new Error(meses.error.message);
  return { linhas: montarDemonstrativo(meses.data, fornecedores, cambio?.taxa ?? null), cambio, fornecedores };
}

export async function getMargens(de: Date, ate: Date) {
  const { data, error } = await db().rpc("admin_margens", { p_de: de.toISOString(), p_ate: ate.toISOString() });
  if (error) throw new Error(error.message);
  return data as { por_plano: Array<Record<string, unknown>>; por_idioma: Array<Record<string, unknown>>; assistente_vendas_usd: number };
}

export type AlertaCusto = { tipo: string; nivel: "atencao" | "critico"; titulo: string; detalhe: string | null };

export async function getAlertasDeCusto(taxa: number | null): Promise<AlertaCusto[]> {
  const { data, error } = await db().rpc("admin_alertas_custos", { p_taxa: taxa ?? 0 });
  if (error) throw new Error(error.message);
  return (data ?? []) as AlertaCusto[];
}

export async function getResumoAssinaturas() {
  const { data, error } = await db().rpc("admin_assinaturas_resumo");
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}
