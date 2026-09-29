import { getCambioUsdBrl, type Cambio } from "@/lib/financeiro/cambio";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOME_DO_IDIOMA } from "@/lib/types";
import { montarIndicadores, type Secoes } from "./indicadores";
import { resolverPeriodo, type PeriodoResolvido } from "./periodos";

// Dados da visão geral. Só roda no servidor, depois de requireArea.
// Agregações feitas no banco (migration 0022).

export type FiltrosVisaoGeral = { periodo?: string; de?: string; ate?: string; idioma?: string; plano?: string; tutor?: string };

export type PontoDaSerie = { dia: string; receita: number; custo_usd: number; erros_ia: number; ativos: number };

export type VisaoGeral = {
  periodo: PeriodoResolvido;
  filtros: { idioma: string | null; plano: string | null; tutor: string | null };
  secoes: Secoes;
  serie: PontoDaSerie[];
  cambio: Cambio | null;
  bruto: Record<string, unknown>;
  opcoes: { idiomas: Array<[string, string]>; planos: string[]; tutores: Array<{ id: string; nome: string }> };
};

const UUID = /^[0-9a-f-]{36}$/i;

export async function getVisaoGeral(entrada: FiltrosVisaoGeral): Promise<VisaoGeral> {
  const db = createSupabaseAdminClient();
  const periodo = resolverPeriodo(entrada);

  const [{ data: planos }, { data: tutores }] = await Promise.all([
    db.from("planos").select("nome").eq("ativo", true).order("ordem"),
    db.from("tutores").select("id, nome").order("nome"),
  ]);
  const idiomas = Object.entries(NOME_DO_IDIOMA) as Array<[string, string]>;
  const idioma = idiomas.some(([k]) => k === entrada.idioma) ? entrada.idioma! : null;
  const plano = (planos ?? []).some((p) => p.nome === entrada.plano) ? entrada.plano! : null;
  const tutor = entrada.tutor && UUID.test(entrada.tutor) && (tutores ?? []).some((t) => t.id === entrada.tutor) ? entrada.tutor : null;

  const args = (de: Date, ate: Date) => ({ p_de: de.toISOString(), p_ate: ate.toISOString(), p_idioma: idioma, p_plano: plano, p_tutor: tutor });
  const [atual, anterior, serie, cambio] = await Promise.all([
    db.rpc("admin_metricas", args(periodo.atual.de, periodo.atual.ate)),
    db.rpc("admin_metricas", args(periodo.anterior.de, periodo.anterior.ate)),
    db.rpc("admin_serie_diaria", args(periodo.atual.de, periodo.atual.ate)),
    getCambioUsdBrl(),
  ]);
  if (atual.error) throw new Error(`Métricas: ${atual.error.message}`);
  if (anterior.error) throw new Error(`Métricas (período anterior): ${anterior.error.message}`);
  if (serie.error) throw new Error(`Série diária: ${serie.error.message}`);

  return {
    periodo,
    filtros: { idioma, plano, tutor },
    secoes: montarIndicadores(atual.data, anterior.data, cambio?.taxa ?? null),
    serie: ((serie.data ?? []) as PontoDaSerie[]).map((p) => ({ ...p, receita: Number(p.receita), custo_usd: Number(p.custo_usd) })),
    cambio,
    bruto: (atual.data ?? {}) as Record<string, unknown>,
    opcoes: { idiomas, planos: (planos ?? []).map((p) => p.nome as string), tutores: (tutores ?? []) as Array<{ id: string; nome: string }> },
  };
}
